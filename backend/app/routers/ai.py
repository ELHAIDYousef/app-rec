import json, httpx
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional, List
from app.core.security import require_role
from app.core.config import get_settings

router = APIRouter(prefix="/api/ia", tags=["IA"])
GROQ_MODEL = "llama-3.3-70b-versatile"


class DemandeDescription(BaseModel):
    titre:  str
    competences: List[str] = []
    notes:  Optional[str] = ""


class DemandeAnalyse(BaseModel):
    cv_text:     str
    motivation:  str
    titre_offre: str
    description: str
    competences: List[str]


def _appeler_groq(messages, max_tokens=700):
    cfg = get_settings()
    if not cfg.GROQ_API_KEY:
        raise HTTPException(400, "Clé GROQ_API_KEY non configurée dans .env")
    try:
        with httpx.Client(timeout=30) as client:
            r = client.post(
                "https://api.groq.com/openai/v1/chat/completions",
                headers={"Authorization": f"Bearer {cfg.GROQ_API_KEY}", "Content-Type": "application/json"},
                json={"model": GROQ_MODEL, "max_tokens": max_tokens, "temperature": 0.7, "messages": messages},
            )
            r.raise_for_status()
            return r.json()["choices"][0]["message"]["content"].strip()
    except httpx.HTTPStatusError as e:
        raise HTTPException(502, f"Erreur Groq : {e.response.text[:200]}")


@router.post("/generer-description")
def generer_description(payload: DemandeDescription, _=Depends(require_role("rh", "admin"))):
    skills_str = ", ".join(payload.competences) if payload.competences else "Non spécifiées"
    prompt = (
        f"Rédige une description professionnelle pour ce poste en français.\n"
        f"Poste : {payload.titre}\nCompétences : {skills_str}\n"
        f"{'Notes : ' + payload.notes if payload.notes else ''}\n"
        f"Inclure : résumé (2-3 phrases), missions (5 points), profil recherché. Max 250 mots."
    )
    desc = _appeler_groq([
        {"role": "system", "content": "Tu es un expert RH. Tu rédiges des offres d'emploi en français."},
        {"role": "user",   "content": prompt},
    ], max_tokens=600)
    return {"description": desc}


@router.post("/analyser-cv")
def analyser_cv(payload: DemandeAnalyse, _=Depends(require_role("rh", "admin"))):
    skills_str = ", ".join(payload.competences[:10]) if payload.competences else "Non spécifiées"
    prompt = (
        f"Évalue cette candidature avec des scores entre 0 et 100.\n"
        f"POSTE : {payload.titre_offre}\nCOMPÉTENCES : {skills_str}\n"
        f"DESCRIPTION : {payload.description[:300]}\n"
        f"CV : {payload.cv_text[:1500]}\nMOTIVATION : {payload.motivation[:400]}\n\n"
        f"Retourne ce JSON avec tes propres scores :\n"
        f'{{"ats_score":72,"skills_score":80,"experience_score":65,"cover_letter_score":70,'
        f'"education_score":60,"keywords_score":75,"matched_skills":["ex"],"missing_skills":["ex"],'
        f'"strengths":["force"],"weaknesses":["faiblesse"],"recommendation":"phrase","scoring_method":"groq_llm"}}\n'
        f"IMPORTANT : Remplace TOUTES les valeurs par ta propre évaluation du CV."
    )
    raw = _appeler_groq([
        {"role": "system", "content": "Tu es un expert ATS. Réponds uniquement en JSON valide."},
        {"role": "user",   "content": prompt},
    ])
    if "```" in raw:
        raw = raw.split("```")[1]
        if raw.startswith("json"): raw = raw[4:]
    try:
        result = json.loads(raw.strip())
        result["ats_score"] = max(0, min(100, int(result.get("ats_score", 0))))
        return result
    except json.JSONDecodeError:
        raise HTTPException(502, "Réponse IA invalide, réessayez")

"""F10 – Analyse intelligente du profil stagiaire"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional, List
from app.core.database import get_db
from app.core.security import require_role
from app.core.groq_helper import appeler_groq_json
from app.models.stage import ProfilAnalyse, CandidatureStage
from app.models.user import Stagiaire

router = APIRouter(prefix="/api/stage/profil", tags=["Stage – F10 Profil IA"])


class ProfilIn(BaseModel):
    cv_text:          str
    motivation:       str
    questionnaire:    Optional[dict] = {}
    conversation_ia:  Optional[str] = ""


def _ser(p: ProfilAnalyse) -> dict:
    return {
        "id":                      p.id,
        "niveau_technique":        p.niveau_technique,
        "competences":             p.competences or [],
        "centres_interet":         p.centres_interet or [],
        "technologies_maitrisees": p.technologies_maitrisees or [],
        "domaine_recommande":      p.domaine_recommande,
        "resume_ia":               p.resume_ia,
        "score":                   p.score,
        "cree_le":                 p.cree_le.isoformat() if p.cree_le else None,
    }


@router.post("/analyser")
def analyser_profil(
    payload: ProfilIn,
    db: Session = Depends(get_db),
    user=Depends(require_role("stagiaire")),
):
    cand = db.query(CandidatureStage).filter(CandidatureStage.stagiaire_id == user.id).first()

    prompt = f"""Analyse ce profil de stagiaire et retourne un JSON structuré.

CV : {payload.cv_text[:2000]}
Lettre de motivation : {payload.motivation[:800]}
Conversation avec assistant : {payload.conversation_ia[:500] if payload.conversation_ia else "Non disponible"}

Retourne EXACTEMENT ce JSON :
{{
  "niveau_technique": "débutant|intermédiaire|avancé",
  "competences": ["compétence1", "compétence2"],
  "centres_interet": ["intérêt1", "intérêt2"],
  "technologies_maitrisees": ["tech1", "tech2"],
  "domaine_recommande": "Développement Web|IA|Data Science|Mobile|Cybersécurité|DevOps|Autre",
  "resume_ia": "Résumé professionnel en 3-4 phrases",
  "score": 75,
  "points_forts": ["force1", "force2"],
  "axes_amelioration": ["axe1", "axe2"]
}}"""

    result = appeler_groq_json([
        {"role": "system", "content": "Tu es un expert RH spécialisé dans l'évaluation des profils stagiaires. Réponds uniquement en JSON valide."},
        {"role": "user", "content": prompt},
    ], max_tokens=1200)

    # Supprimer ancienne analyse si elle existe
    if cand:
        old = db.query(ProfilAnalyse).filter(ProfilAnalyse.candidature_id == cand.id).first()
        if old:
            db.delete(old)

    analyse = ProfilAnalyse(
        stagiaire_id            = user.id,
        candidature_id          = cand.id if cand else None,
        niveau_technique        = result.get("niveau_technique"),
        competences             = result.get("competences", []),
        centres_interet         = result.get("centres_interet", []),
        technologies_maitrisees = result.get("technologies_maitrisees", []),
        domaine_recommande      = result.get("domaine_recommande"),
        resume_ia               = result.get("resume_ia"),
        score                   = result.get("score"),
    )
    db.add(analyse); db.commit(); db.refresh(analyse)
    return {**_ser(analyse), "points_forts": result.get("points_forts", []), "axes_amelioration": result.get("axes_amelioration", [])}


@router.get("/mon-analyse")
def mon_analyse(db: Session = Depends(get_db), user=Depends(require_role("stagiaire"))):
    analyse = db.query(ProfilAnalyse).filter(
        ProfilAnalyse.stagiaire_id == user.id
    ).order_by(ProfilAnalyse.cree_le.desc()).first()
    if not analyse:
        raise HTTPException(404, "Aucune analyse disponible")
    return _ser(analyse)


@router.get("/{stagiaire_id}")
def analyse_admin(stagiaire_id: int, db: Session = Depends(get_db), user=Depends(require_role("admin", "rh"))):
    analyse = db.query(ProfilAnalyse).filter(
        ProfilAnalyse.stagiaire_id == stagiaire_id
    ).order_by(ProfilAnalyse.cree_le.desc()).first()
    if not analyse:
        raise HTTPException(404, "Aucune analyse disponible")
    return _ser(analyse)

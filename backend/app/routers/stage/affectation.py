"""F12 – Affectation automatique des sujets via IA"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from app.core.database import get_db
from app.core.security import require_role
from app.core.groq_helper import appeler_groq_json
from app.models.stage import CandidatureStage, SujetStage, ProfilAnalyse

router = APIRouter(prefix="/api/stage/affectation", tags=["Stage – F12 Affectation"])


class AffectationIn(BaseModel):
    sujet_id: int


@router.post("/matcher/{cid}")
def matcher(
    cid: int,
    db: Session = Depends(get_db),
    user=Depends(require_role("admin", "rh")),
):
    cand = db.get(CandidatureStage, cid)
    if not cand: raise HTTPException(404, "Candidature introuvable")

    profil = db.query(ProfilAnalyse).filter(ProfilAnalyse.candidature_id == cid).first()
    sujets = db.query(SujetStage).filter(SujetStage.statut == "disponible").limit(20).all()

    if not sujets:
        raise HTTPException(400, "Aucun sujet disponible pour le matching")

    sujets_txt = "\n".join([
        f"- ID:{s.id} | Titre:{s.titre} | Techs:{s.technologies} | Niveau:{s.niveau_requis}"
        for s in sujets
    ])

    profil_txt = f"""
Niveau technique : {profil.niveau_technique if profil else 'Non analysé'}
Compétences : {profil.competences if profil else []}
Technologies : {profil.technologies_maitrisees if profil else []}
Domaine recommandé : {profil.domaine_recommande if profil else 'Non défini'}
Motivation : {cand.motivation[:500]}"""

    prompt = f"""Tu es un expert en affectation de stages. Analyse le profil et classe les sujets par pertinence.

PROFIL STAGIAIRE :
{profil_txt}

SUJETS DISPONIBLES :
{sujets_txt}

Retourne ce JSON exact :
{{
  "sujet_optimal_id": <id_entier>,
  "score_optimal": <0-100>,
  "justification": "Explication en 2-3 phrases",
  "classement": [
    {{"id": <id>, "score": <0-100>, "raison": "courte raison"}}
  ]
}}"""

    result = appeler_groq_json([
        {"role": "system", "content": "Tu es expert en matching stagiaires/sujets. Réponds uniquement en JSON valide."},
        {"role": "user", "content": prompt},
    ], max_tokens=1000)

    sujets_map = {s.id: s for s in sujets}
    classement = []
    for item in result.get("classement", []):
        sid = item.get("id")
        if sid in sujets_map:
            s = sujets_map[sid]
            classement.append({
                "id":     s.id,
                "titre":  s.titre,
                "score":  item.get("score", 0),
                "raison": item.get("raison", ""),
                "technologies": s.technologies or [],
                "niveau_requis": s.niveau_requis,
            })

    optimal_id = result.get("sujet_optimal_id")
    optimal = sujets_map.get(optimal_id)

    return {
        "sujet_optimal": {
            "id":           optimal.id if optimal else None,
            "titre":        optimal.titre if optimal else None,
            "description":  optimal.description if optimal else None,
            "technologies": optimal.technologies if optimal else [],
        } if optimal else None,
        "score_optimal":  result.get("score_optimal", 0),
        "justification":  result.get("justification", ""),
        "classement":     classement[:5],
    }


@router.post("/affecter/{cid}")
def affecter(
    cid: int,
    payload: AffectationIn,
    db: Session = Depends(get_db),
    user=Depends(require_role("admin", "rh")),
):
    cand = db.get(CandidatureStage, cid)
    if not cand: raise HTTPException(404)

    sujet_id = payload.sujet_id
    sujet = db.get(SujetStage, sujet_id)
    if not sujet: raise HTTPException(404, "Sujet introuvable")
    if sujet.statut not in ("disponible", "reserve"):
        raise HTTPException(400, f"Sujet non disponible (statut: {sujet.statut})")

    cand.sujet_id = sujet_id
    cand.statut   = "acceptee"
    sujet.statut  = "affecte"
    db.commit()

    return {"message": f"Sujet « {sujet.titre} » affecté avec succès", "candidature_id": cid, "sujet_id": sujet_id}


@router.get("/ma-proposition")
def ma_proposition(db: Session = Depends(get_db), user=Depends(require_role("stagiaire"))):
    cand = db.query(CandidatureStage).filter(
        CandidatureStage.stagiaire_id == user.id,
        CandidatureStage.statut == "acceptee",
    ).first()
    if not cand:
        raise HTTPException(404, "Aucune candidature acceptée")
    if not cand.sujet:
        raise HTTPException(404, "Aucun sujet affecté")
    s = cand.sujet
    return {
        "sujet": {
            "id":            s.id,
            "titre":         s.titre,
            "description":   s.description,
            "technologies":  s.technologies or [],
            "niveau_requis": s.niveau_requis,
            "encadrant":     s.encadrant,
        },
        "candidature_id": cand.id,
    }

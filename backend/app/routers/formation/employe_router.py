from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from app.core.database import get_db
from app.models.formation import Employe, Formation, Resultat
from app.routers.formation.schemas import (
    QuestionTestOut, SoumettreIn, SoumettreOut,
    ResultatListOut, ResultatDetailOut,
)
from app.routers.formation.formation_auth import get_employe
from app.routers.formation.groq_service import corriger

router = APIRouter(prefix="/api/formation/employe", tags=["Formation — Employé"])


@router.get("/formations")
def formations_disponibles(
    db:  Session = Depends(get_db),
    emp: Employe = Depends(get_employe),
):
    formations = db.query(Formation).all()
    result = []
    for f in formations:
        nb_q = len(f.questions)
        if nb_q == 0:
            continue
        meilleur = (
            db.query(Resultat)
            .filter(Resultat.employe_id == emp.id, Resultat.formation_id == f.id)
            .order_by(Resultat.note.desc())
            .first()
        )
        nb_tentatives = (
            db.query(Resultat)
            .filter(Resultat.employe_id == emp.id, Resultat.formation_id == f.id)
            .count()
        )
        result.append({
            "id":             f.id,
            "titre":          f.titre,
            "nb_questions":   nb_q,
            "meilleure_note": meilleur.note if meilleur else None,
            "nb_tentatives":  nb_tentatives,
        })
    return result


@router.get("/formations/{fid}/questions", response_model=List[QuestionTestOut])
def questions_pour_test(
    fid: int,
    db:  Session = Depends(get_db),
    _:   Employe = Depends(get_employe),
):
    f = db.get(Formation, fid)
    if not f or not f.questions:
        raise HTTPException(404, "Formation introuvable ou sans questions")
    return sorted(f.questions, key=lambda q: q.ordre)


@router.post("/formations/{fid}/soumettre", response_model=SoumettreOut)
def soumettre(
    fid:     int,
    payload: SoumettreIn,
    db:      Session = Depends(get_db),
    emp:     Employe = Depends(get_employe),
):
    f = db.get(Formation, fid)
    if not f:
        raise HTTPException(404, "Formation introuvable")
    qs = sorted(f.questions, key=lambda q: q.ordre)
    if not qs:
        raise HTTPException(400, "Aucune question disponible pour cette formation")

    qs_dict = [
        {"type": q.type, "question": q.question,
         "options": q.options, "bonne_reponse": q.bonne_reponse}
        for q in qs
    ]
    correction = corriger(qs_dict, payload.reponses)
    note       = correction.get("note", 0)
    details    = correction.get("corrections", [])

    r = Resultat(
        employe_id=emp.id, formation_id=fid,
        note=note, reponses=payload.reponses,
        corrections=details, duree_min=payload.duree_min,
    )
    db.add(r); db.commit(); db.refresh(r)
    return SoumettreOut(resultat_id=r.id, note=note, corrections=details)


@router.get("/resultats", response_model=List[ResultatListOut])
def mes_resultats(
    db:  Session = Depends(get_db),
    emp: Employe = Depends(get_employe),
):
    rs = (
        db.query(Resultat)
        .filter(Resultat.employe_id == emp.id)
        .order_by(Resultat.passe_le.desc())
        .all()
    )
    return [
        ResultatListOut(
            id=r.id, formation=r.formation.titre,
            note=r.note, duree_min=r.duree_min, passe_le=r.passe_le,
        )
        for r in rs
    ]


@router.get("/resultats/{rid}", response_model=ResultatDetailOut)
def detail_resultat(
    rid: int,
    db:  Session = Depends(get_db),
    emp: Employe = Depends(get_employe),
):
    r = (
        db.query(Resultat)
        .filter(Resultat.id == rid, Resultat.employe_id == emp.id)
        .first()
    )
    if not r:
        raise HTTPException(404, "Résultat introuvable")
    return r

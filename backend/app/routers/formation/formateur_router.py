import os
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, BackgroundTasks
from sqlalchemy.orm import Session
from typing import Optional, List
from app.core.database import get_db, SessionLocal
from app.models.formation import Employe, Formation, Question
from app.routers.formation.schemas import (
    EmployeIn, EmployeListOut, FormationListOut,
    QuestionOut, QuestionsFormationOut,
)
from app.routers.formation.formation_auth import require_formateur, generer_code, ROLE_FORMATEUR
from app.routers.formation.groq_service import generer_questions
import fitz

router = APIRouter(prefix="/api/formation/formateur", tags=["Formation — Formateur"])

UPLOAD_DIR = os.getenv("UPLOAD_DIR", "app/uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)


# ── Employés ──────────────────────────────────────────────

@router.get("/employes", response_model=List[EmployeListOut])
def lister_employes(
    db: Session = Depends(get_db),
    _:  Employe = Depends(require_formateur),
):
    return (
        db.query(Employe)
        .filter(Employe.role == "employe")
        .order_by(Employe.cree_le.desc())
        .all()
    )


@router.post("/employes", status_code=201)
def creer_employe(
    payload: EmployeIn,
    db: Session = Depends(get_db),
    _:  Employe = Depends(require_formateur),
):
    code = generer_code(role="employe")
    while db.query(Employe).filter(Employe.code_employe == code).first():
        code = generer_code(role="employe")
    emp = Employe(nom=payload.nom.strip(), code_employe=code, role="employe")
    db.add(emp); db.commit(); db.refresh(emp)
    return {"id": emp.id, "nom": emp.nom, "code": emp.code_employe, "role": emp.role}


@router.patch("/employes/{emp_id}/activer")
def basculer_employe(
    emp_id: int,
    db: Session = Depends(get_db),
    _:  Employe = Depends(require_formateur),
):
    emp = db.get(Employe, emp_id)
    if not emp:
        raise HTTPException(404, "Employé introuvable")
    if emp.role == ROLE_FORMATEUR:
        raise HTTPException(400, "Impossible de modifier un formateur via cette route")
    emp.is_active = 0 if emp.is_active else 1
    db.commit()
    return {"id": emp.id, "is_active": emp.is_active}


@router.post("/formateurs", status_code=201)
def creer_formateur(
    payload: EmployeIn,
    db: Session = Depends(get_db),
    _:  Employe = Depends(require_formateur),
):
    code = generer_code(role=ROLE_FORMATEUR)
    while db.query(Employe).filter(Employe.code_employe == code).first():
        code = generer_code(role=ROLE_FORMATEUR)
    emp = Employe(nom=payload.nom.strip(), code_employe=code, role=ROLE_FORMATEUR)
    db.add(emp); db.commit(); db.refresh(emp)
    return {"id": emp.id, "nom": emp.nom, "code": emp.code_employe, "role": emp.role}


# ── Formations ────────────────────────────────────────────

@router.get("/formations", response_model=List[FormationListOut])
def lister_formations(
    db: Session = Depends(get_db),
    _:  Employe = Depends(require_formateur),
):
    formations = db.query(Formation).order_by(Formation.cree_le.desc()).all()
    return [
        FormationListOut(
            id=f.id, titre=f.titre,
            nb_questions=len(f.questions),
            cree_le=f.cree_le,
        )
        for f in formations
    ]


@router.post("/formations", status_code=201)
async def creer_formation(
    background_tasks: BackgroundTasks,
    titre:   str                    = Form(...),
    contenu: Optional[str]          = Form(None),
    fichier: Optional[UploadFile]   = File(None),
    db:      Session                = Depends(get_db),
    formateur: Employe              = Depends(require_formateur),
):
    texte = contenu or ""

    if fichier:
        data = await fichier.read()
        path = os.path.join(UPLOAD_DIR, f"form_{fichier.filename}")
        with open(path, "wb") as fp:
            fp.write(data)
        doc   = fitz.open(stream=data, filetype="pdf")
        texte = "\n".join(page.get_text() for page in doc)

    if not texte.strip():
        raise HTTPException(400, "Contenu ou PDF requis")

    formation = Formation(
        titre=titre.strip(), contenu=texte,
        pdf_fichier=fichier.filename if fichier else None,
        cree_par=formateur.id,
    )
    db.add(formation); db.commit(); db.refresh(formation)

    def _generer(fid: int, t: str, c: str):
        s = SessionLocal()
        try:
            qs = generer_questions(t, c)
            qs = qs[:20]  # Limiter à 20 questions maximum
            for i, q in enumerate(qs):
                s.add(Question(
                    formation_id=fid, type=q["type"],
                    question=q["question"], options=q.get("options"),
                    bonne_reponse=q["bonne_reponse"], ordre=i,
                ))
            s.commit()
        finally:
            s.close()

    background_tasks.add_task(_generer, formation.id, titre, texte)
    return {
        "id":      formation.id,
        "titre":   formation.titre,
        "message": "Formation créée — génération des questions en cours",
    }


@router.get("/formateurs", response_model=List[EmployeListOut])
def lister_formateurs(
    db: Session = Depends(get_db),
    _:  Employe = Depends(require_formateur),
):
    return (
        db.query(Employe)
        .filter(Employe.role == ROLE_FORMATEUR)
        .order_by(Employe.cree_le.desc())
        .all()
    )


@router.delete("/formations/{fid}", status_code=204)
def supprimer_formation(
    fid: int,
    db:  Session = Depends(get_db),
    _:   Employe = Depends(require_formateur),
):
    f = db.get(Formation, fid)
    if not f:
        raise HTTPException(404, "Formation introuvable")
    db.delete(f); db.commit()


@router.get("/formations/{fid}/questions", response_model=QuestionsFormationOut)
def voir_questions(
    fid: int,
    db:  Session = Depends(get_db),
    _:   Employe = Depends(require_formateur),
):
    f = db.get(Formation, fid)
    if not f:
        raise HTTPException(404, "Formation introuvable")
    return QuestionsFormationOut(
        formation=f.titre,
        questions=sorted(f.questions, key=lambda q: q.ordre),
    )


@router.delete("/employes/{emp_id}", status_code=204)
def supprimer_employe(
    emp_id: int,
    db: Session = Depends(get_db),
    _: Employe = Depends(require_formateur),
):
    emp = db.get(Employe, emp_id)
    if not emp:
        raise HTTPException(404, "Employé introuvable")
    if emp.role == ROLE_FORMATEUR:
        raise HTTPException(400, "Impossible de supprimer un formateur via cette route")
    # Delete related results first
    from app.models.formation import Resultat
    db.query(Resultat).filter(Resultat.employe_id == emp_id).delete()
    db.delete(emp)
    db.commit()

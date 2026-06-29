"""F8 – Gestion des candidatures de stage"""
import math, os
from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File, Form
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from typing import Optional
from app.core.config import get_settings
from app.core.database import get_db
from app.core.security import require_role
from app.core.upload_helper import valider_et_sauvegarder, ALLOWED_PDF
from app.models.stage import CandidatureStage, SujetStage
from app.models.user import User

router = APIRouter(prefix="/api/stage/candidatures", tags=["Stage – F8 Candidatures"])
cfg = get_settings()

UPLOAD_DIR = "uploads/stage"
os.makedirs(UPLOAD_DIR, exist_ok=True)


def _ser(c: CandidatureStage) -> dict:
    return {
        "id":                 c.id,
        "stagiaire_id":       c.stagiaire_id,
        "stagiaire_nom":      c.stagiaire.nom if c.stagiaire else None,
        "stagiaire_email":    c.stagiaire.email if c.stagiaire else None,
        "motivation":         c.motivation,
        "cv_fichier":         bool(c.cv_fichier),
        "convention_fichier": bool(c.convention_fichier),
        "statut":             c.statut,
        "sujet_id":           c.sujet_id,
        "sujet_titre":        c.sujet.titre if c.sujet else None,
        "message_ia":         c.message_ia,
        "cree_le":            c.cree_le.isoformat() if c.cree_le else None,
    }


# ── Stagiaire : soumettre sa candidature ─────────────────────
@router.post("", status_code=201)
async def soumettre(
    motivation: str = Form(...),
    cv: Optional[UploadFile] = File(None),
    convention: Optional[UploadFile] = File(None),
    db: Session = Depends(get_db),
    user=Depends(require_role("stagiaire")),
):
    existing = db.query(CandidatureStage).filter(
        CandidatureStage.stagiaire_id == user.id,
        CandidatureStage.statut != "refusee",
    ).first()
    if existing:
        raise HTTPException(400, "Vous avez déjà une candidature active")

    cand = CandidatureStage(stagiaire_id=user.id, motivation=motivation)

    if cv and cv.filename:
        nom = await valider_et_sauvegarder(cv, UPLOAD_DIR, ALLOWED_PDF, cfg.MAX_UPLOAD_MB)
        cand.cv_fichier = os.path.join(UPLOAD_DIR, nom)
    if convention and convention.filename:
        nom = await valider_et_sauvegarder(convention, UPLOAD_DIR, ALLOWED_PDF, cfg.MAX_UPLOAD_MB)
        cand.convention_fichier = os.path.join(UPLOAD_DIR, nom)

    db.add(cand); db.commit(); db.refresh(cand)
    return _ser(cand)


# ── Stagiaire : mes candidatures ─────────────────────────────
@router.get("/mes")
def mes_candidatures(
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=50),
    db: Session = Depends(get_db),
    user=Depends(require_role("stagiaire")),
):
    q = db.query(CandidatureStage).filter(CandidatureStage.stagiaire_id == user.id)
    total = q.count()
    items = q.order_by(CandidatureStage.cree_le.desc()).offset((page-1)*page_size).limit(page_size).all()
    return {"items": [_ser(c) for c in items], "total": total, "page": page,
            "pages": math.ceil(total / page_size) or 1}


# ── Admin/RH : lister toutes les candidatures ────────────────
@router.get("")
def lister(
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=50),
    statut: Optional[str] = None,
    db: Session = Depends(get_db),
    user=Depends(require_role("admin", "rh")),
):
    q = db.query(CandidatureStage)
    if statut:
        q = q.filter(CandidatureStage.statut == statut)
    total = q.count()
    items = q.order_by(CandidatureStage.cree_le.desc()).offset((page-1)*page_size).limit(page_size).all()
    return {"items": [_ser(c) for c in items], "total": total, "page": page,
            "pages": math.ceil(total / page_size) or 1}


@router.get("/{cid}")
def obtenir(cid: int, db: Session = Depends(get_db), user=Depends(require_role("admin", "rh", "stagiaire"))):
    c = db.get(CandidatureStage, cid)
    if not c: raise HTTPException(404, "Introuvable")
    if user.role == "stagiaire" and c.stagiaire_id != user.id:
        raise HTTPException(403)
    return _ser(c)


# ── Stagiaire : modifier sa candidature ──────────────────────
@router.patch("/{cid}/modifier")
async def modifier(
    cid: int,
    motivation: Optional[str] = Form(None),
    cv: Optional[UploadFile] = File(None),
    convention: Optional[UploadFile] = File(None),
    db: Session = Depends(get_db),
    user=Depends(require_role("stagiaire")),
):
    c = db.get(CandidatureStage, cid)
    if not c: raise HTTPException(404, "Introuvable")
    if c.stagiaire_id != user.id: raise HTTPException(403)
    if c.statut == "acceptee":
        raise HTTPException(400, "Impossible de modifier une candidature déjà acceptée")

    if motivation and motivation.strip():
        c.motivation = motivation.strip()

    if cv and cv.filename:
        nom = await valider_et_sauvegarder(cv, UPLOAD_DIR, ALLOWED_PDF, cfg.MAX_UPLOAD_MB)
        c.cv_fichier = os.path.join(UPLOAD_DIR, nom)
    if convention and convention.filename:
        nom = await valider_et_sauvegarder(convention, UPLOAD_DIR, ALLOWED_PDF, cfg.MAX_UPLOAD_MB)
        c.convention_fichier = os.path.join(UPLOAD_DIR, nom)

    db.commit(); db.refresh(c)
    return _ser(c)


@router.patch("/{cid}/statut")
def changer_statut(
    cid: int,
    payload: dict,
    db: Session = Depends(get_db),
    user=Depends(require_role("admin", "rh")),
):
    c = db.get(CandidatureStage, cid)
    if not c: raise HTTPException(404)
    if "statut" in payload:
        c.statut = payload["statut"]
    if "message_ia" in payload:
        c.message_ia = payload["message_ia"]
    if "sujet_id" in payload:
        c.sujet_id = payload["sujet_id"]
        if payload["sujet_id"]:
            sujet = db.get(SujetStage, payload["sujet_id"])
            if sujet and sujet.statut == "disponible":
                sujet.statut = "affecte"
    db.commit(); db.refresh(c)
    return _ser(c)


# ── Téléchargement CV / convention ───────────────────────────
@router.get("/{cid}/cv")
def dl_cv(cid: int, db: Session = Depends(get_db), user=Depends(require_role("admin", "rh", "stagiaire"))):
    c = db.get(CandidatureStage, cid)
    if not c or not c.cv_fichier: raise HTTPException(404, "Fichier introuvable")
    if user.role == "stagiaire" and c.stagiaire_id != user.id:
        raise HTTPException(403)
    return FileResponse(c.cv_fichier, filename=os.path.basename(c.cv_fichier))


@router.get("/{cid}/convention")
def dl_convention(cid: int, db: Session = Depends(get_db), user=Depends(require_role("admin", "rh", "stagiaire"))):
    c = db.get(CandidatureStage, cid)
    if not c or not c.convention_fichier: raise HTTPException(404, "Fichier introuvable")
    if user.role == "stagiaire" and c.stagiaire_id != user.id:
        raise HTTPException(403)
    return FileResponse(c.convention_fichier, filename=os.path.basename(c.convention_fichier))

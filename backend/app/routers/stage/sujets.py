"""F11 – Gestion des sujets de stage"""
import math
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import Optional, List
from pydantic import BaseModel
from app.core.database import get_db
from app.core.security import require_role, get_current_user
from app.models.stage import SujetStage

router = APIRouter(prefix="/api/stage/sujets", tags=["Stage – F11 Sujets"])


class SujetIn(BaseModel):
    titre:         str
    description:   str
    technologies:  Optional[List[str]] = []
    niveau_requis: Optional[str] = None
    encadrant:     Optional[str] = None
    encadrant_id:  Optional[int] = None


def _ser(s: SujetStage) -> dict:
    return {
        "id":            s.id,
        "titre":         s.titre,
        "description":   s.description,
        "technologies":  s.technologies or [],
        "niveau_requis": s.niveau_requis,
        "encadrant":     s.encadrant,
        "encadrant_id":  s.encadrant_id,
        "statut":        s.statut,
        "cree_le":       s.cree_le.isoformat() if s.cree_le else None,
    }


@router.get("")
def lister(
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=100),
    statut: Optional[str] = None,
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    q = db.query(SujetStage)
    if statut:
        q = q.filter(SujetStage.statut == statut)
    elif user.role == "stagiaire":
        q = q.filter(SujetStage.statut == "disponible")
    total = q.count()
    items = q.order_by(SujetStage.cree_le.desc()).offset((page-1)*page_size).limit(page_size).all()
    return {"items": [_ser(s) for s in items], "total": total, "page": page,
            "pages": math.ceil(total / page_size) or 1}


@router.post("", status_code=201)
def creer(payload: SujetIn, db: Session = Depends(get_db), user=Depends(require_role("admin", "rh"))):
    s = SujetStage(**payload.model_dump(), cree_par=user.id)
    db.add(s); db.commit(); db.refresh(s)
    return _ser(s)


@router.patch("/{sid}")
def modifier(sid: int, payload: SujetIn, db: Session = Depends(get_db), user=Depends(require_role("admin", "rh"))):
    s = db.get(SujetStage, sid)
    if not s: raise HTTPException(404)
    for k, v in payload.model_dump(exclude_unset=True).items():
        setattr(s, k, v)
    db.commit(); db.refresh(s)
    return _ser(s)


@router.patch("/{sid}/statut")
def changer_statut(sid: int, payload: dict, db: Session = Depends(get_db), user=Depends(require_role("admin", "rh"))):
    s = db.get(SujetStage, sid)
    if not s: raise HTTPException(404)
    s.statut = payload.get("statut", s.statut)
    db.commit(); db.refresh(s)
    return _ser(s)


@router.delete("/{sid}", status_code=204)
def supprimer(sid: int, db: Session = Depends(get_db), user=Depends(require_role("admin"))):
    s = db.get(SujetStage, sid)
    if not s: raise HTTPException(404)
    db.delete(s); db.commit()

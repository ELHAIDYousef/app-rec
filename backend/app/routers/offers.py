from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.security import get_current_user, require_role
from app.models.offer import Offre
from app.models.application import Application
from app.models.user import User
from app.schemas.offer import OffreCreate, OffreUpdate, OffreOut

router = APIRouter(prefix="/api/offres", tags=["Offres"])


def _enrichir(offre: Offre, db: Session) -> OffreOut:
    out = OffreOut.model_validate(offre)
    out.nb_candidatures = db.query(Application).filter(Application.offre_id == offre.id).count()
    if offre.cree_par_user:
        out.nom_createur = offre.cree_par_user.nom
    return out


@router.get("", response_model=List[OffreOut])
def lister_offres(
    statut: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    q = db.query(Offre)
    if statut: q = q.filter(Offre.statut == statut)
    # RH voit seulement ses propres offres — Admin voit tout
    if user.role == "rh":
        q = q.filter(Offre.cree_par == user.id)
    return [_enrichir(o, db) for o in q.order_by(Offre.cree_le.desc()).all()]


@router.get("/{offre_id}", response_model=OffreOut)
def get_offre(offre_id: int, db: Session = Depends(get_db), _=Depends(get_current_user)):
    offre = db.get(Offre, offre_id)
    if not offre: raise HTTPException(404, "Offre introuvable")
    return _enrichir(offre, db)


@router.post("", response_model=OffreOut, status_code=201)
def creer_offre(payload: OffreCreate, db: Session = Depends(get_db), user: User = Depends(require_role("rh", "admin"))):
    offre = Offre(
        titre=payload.titre, description=payload.description,
        competences=payload.competences, date_debut=payload.date_debut,
        date_fin=payload.date_fin, statut=payload.statut, cree_par=user.id,
    )
    db.add(offre); db.commit(); db.refresh(offre)
    return _enrichir(offre, db)


@router.patch("/{offre_id}", response_model=OffreOut)
def modifier_offre(offre_id: int, payload: OffreUpdate, db: Session = Depends(get_db), user: User = Depends(require_role("rh", "admin"))):
    offre = db.get(Offre, offre_id)
    if not offre: raise HTTPException(404, "Offre introuvable")
    if user.role == "rh" and offre.cree_par != user.id:
        raise HTTPException(403, "Vous ne pouvez modifier que vos propres offres")
    for champ, val in payload.model_dump(exclude_none=True).items():
        setattr(offre, champ, val)
    db.commit(); db.refresh(offre)
    return _enrichir(offre, db)


@router.delete("/{offre_id}", status_code=204)
def supprimer_offre(offre_id: int, db: Session = Depends(get_db), user: User = Depends(require_role("rh", "admin"))):
    offre = db.get(Offre, offre_id)
    if not offre: raise HTTPException(404, "Offre introuvable")
    if user.role == "rh" and offre.cree_par != user.id:
        raise HTTPException(403, "Vous ne pouvez supprimer que vos propres offres")
    db.delete(offre); db.commit()

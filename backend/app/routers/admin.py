import math
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.security import hash_password, require_role
from app.models.application import Application
from app.models.offer import Offre
from app.models.user import User, UserRole, Candidat, RessourceHumaine, Admin, Encadrant
from app.schemas.user import UserCreate, UserOut

router = APIRouter(prefix="/api/admin", tags=["Admin"])


@router.get("/utilisateurs")
def lister_utilisateurs(
    page: Optional[int] = Query(None, ge=1),
    page_size: Optional[int] = Query(None, ge=1),
    db: Session = Depends(get_db),
    _=Depends(require_role("admin")),
):
    q = db.query(User).order_by(User.cree_le.desc())
    total = q.count()
    if page is not None and page_size is not None:
        items = q.offset((page - 1) * page_size).limit(page_size).all()
        pages = math.ceil(total / page_size) if total > 0 else 1
    else:
        items = q.all()
        page = 1
        page_size = total or 1
        pages = 1
    return {
        "items": [UserOut.model_validate(u).model_dump(mode="json") for u in items],
        "total": total,
        "page": page,
        "pages": pages,
        "page_size": page_size,
    }


@router.post("/utilisateurs", response_model=UserOut, status_code=201)
def creer_utilisateur(payload: UserCreate, db: Session = Depends(get_db),
                      _=Depends(require_role("admin"))):
    if payload.role == UserRole.candidat:
        raise HTTPException(400, "Les candidats s'inscrivent eux-mêmes via la page d'inscription")
    if db.query(User).filter(User.email == payload.email).first():
        raise HTTPException(400, "Cet email est déjà utilisé")

    if payload.role == UserRole.rh:
        user = RessourceHumaine(
            nom=payload.nom, email=payload.email,
            mot_de_passe=hash_password(payload.mot_de_passe),
            role=UserRole.rh,
            departement=payload.departement,
        )
    elif payload.role == UserRole.encadrant:
        user = Encadrant(
            nom=payload.nom, email=payload.email,
            mot_de_passe=hash_password(payload.mot_de_passe),
            role=UserRole.encadrant,
            departement=payload.departement,
            specialite=payload.specialite,
        )
    else:  # admin
        user = Admin(
            nom=payload.nom, email=payload.email,
            mot_de_passe=hash_password(payload.mot_de_passe),
            role=UserRole.admin,
            departement=payload.departement,
        )

    db.add(user); db.commit(); db.refresh(user)
    return user


@router.patch("/utilisateurs/{user_id}/activer", response_model=UserOut)
def basculer_activation(user_id: int, db: Session = Depends(get_db),
                        moi=Depends(require_role("admin"))):
    user = db.get(User, user_id)
    if not user: raise HTTPException(404, "Utilisateur introuvable")
    if user.id == moi.id: raise HTTPException(400, "Vous ne pouvez pas vous désactiver")
    user.is_active = not user.is_active
    db.commit(); db.refresh(user)
    return user


@router.get("/graphiques")
def graphiques(db: Session = Depends(get_db), user=Depends(require_role("rh", "admin"))):
    from sqlalchemy import func
    from datetime import datetime, timezone, timedelta

    is_rh = user.role == "rh"

    # --- Répartition statuts ---
    q_stat = db.query(Application.statut, func.count(Application.id))
    if is_rh:
        q_stat = q_stat.join(Offre, Application.offre_id == Offre.id).filter(Offre.cree_par == user.id)
    statuts = dict(q_stat.group_by(Application.statut).all())

    # --- Top 5 offres par candidatures ---
    q_top = (
        db.query(Offre.titre, func.count(Application.id).label("cnt"))
        .join(Application, Application.offre_id == Offre.id)
    )
    if is_rh:
        q_top = q_top.filter(Offre.cree_par == user.id)
    top_offres = (
        q_top.group_by(Offre.id, Offre.titre)
        .order_by(func.count(Application.id).desc())
        .limit(5).all()
    )

    # --- Candidatures par mois (6 derniers mois) ---
    six_months_ago = (datetime.now(timezone.utc).replace(day=1) - timedelta(days=150)).replace(tzinfo=None)
    q_mois = db.query(
        func.date_format(Application.postule_le, "%Y-%m").label("mois"),
        func.count(Application.id).label("cnt"),
    ).filter(Application.postule_le >= six_months_ago)
    if is_rh:
        q_mois = q_mois.join(Offre, Application.offre_id == Offre.id).filter(Offre.cree_par == user.id)
    par_mois = (
        q_mois
        .group_by(func.date_format(Application.postule_le, "%Y-%m"))
        .order_by(func.date_format(Application.postule_le, "%Y-%m"))
        .all()
    )

    return {
        "repartition_statuts": {
            "en_attente":  statuts.get("en_attente",  0),
            "examinee":    statuts.get("examinee",    0),
            "selectionne": statuts.get("selectionne", 0),
            "refusee":     statuts.get("refusee",     0),
            "embauche":    statuts.get("embauche",    0),
        },
        "top_offres": [{"titre": t[:40], "count": c} for t, c in top_offres],
        "par_mois":   [{"mois": m, "count": c} for m, c in par_mois],
    }


@router.get("/statistiques")
def statistiques(db: Session = Depends(get_db), _=Depends(require_role("rh", "admin", "encadrant"))):
    from sqlalchemy import func as sqlfunc
    return {
        "total_offres":       db.query(Offre).count(),
        "offres_ouvertes":    db.query(Offre).filter(Offre.statut == "ouverte").count(),
        "total_candidatures": db.query(Application).count(),
        "total_candidats":    db.query(User).filter(User.role == UserRole.candidat).count(),
        "candidats_actifs":   db.query(User).filter(User.role == UserRole.candidat, User.is_active == True).count(),
        "embauches":          db.query(Application).filter(Application.statut == "embauche").count(),
        "en_attente":         db.query(Application).filter(Application.statut == "en_attente").count(),
        "selectionnes":       db.query(Application).filter(Application.statut == "selectionne").count(),
        "refusees":           db.query(Application).filter(Application.statut == "refusee").count(),
    }


@router.delete("/utilisateurs/{user_id}", status_code=204)
def supprimer_utilisateur(user_id: int, db: Session = Depends(get_db),
                          moi=Depends(require_role("admin"))):
    user = db.get(User, user_id)
    if not user:
        raise HTTPException(404, "Utilisateur introuvable")
    if user.id == moi.id:
        raise HTTPException(400, "Vous ne pouvez pas supprimer votre propre compte")
    # Delete related applications if candidat
    if user.role == UserRole.candidat:
        from app.models.notification import Notification
        db.query(Notification).filter(Notification.user_id == user_id).delete()
        db.query(Application).filter(Application.user_id == user_id).delete()
    db.delete(user)
    db.commit()

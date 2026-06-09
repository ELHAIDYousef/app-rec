from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.security import hash_password, require_role
from app.models.application import Application
from app.models.offer import Offre
from app.models.user import User, UserRole, Candidat, RessourceHumaine, Admin
from app.schemas.user import UserCreate, UserOut

router = APIRouter(prefix="/api/admin", tags=["Admin"])


@router.get("/utilisateurs", response_model=list[UserOut])
def lister_utilisateurs(db: Session = Depends(get_db), _=Depends(require_role("admin"))):
    return db.query(User).order_by(User.cree_le.desc()).all()


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


@router.get("/statistiques")
def statistiques(db: Session = Depends(get_db), _=Depends(require_role("rh", "admin"))):
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

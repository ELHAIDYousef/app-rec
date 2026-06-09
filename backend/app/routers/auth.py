from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.security import hash_password, verify_password, create_access_token, get_current_user
from app.models.user import User, UserRole, Candidat, RessourceHumaine, Admin
from app.schemas.user import UserRegister, UserLogin, UserOut, UserUpdate, PasswordChange, TokenOut, RHSettings

router = APIRouter(prefix="/api/auth", tags=["Auth"])


@router.post("/inscription", response_model=TokenOut, status_code=201)
def inscription(payload: UserRegister, db: Session = Depends(get_db)):
    if db.query(User).filter(User.email == payload.email).first():
        raise HTTPException(400, "Cet email est déjà utilisé")
    user = Candidat(
        nom=payload.nom,
        email=payload.email,
        mot_de_passe=hash_password(payload.mot_de_passe),
    )
    db.add(user); db.commit(); db.refresh(user)
    return {"access_token": create_access_token({"sub": str(user.id)}), "user": user}


@router.post("/connexion", response_model=TokenOut)
def connexion(payload: UserLogin, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == payload.email).first()
    if not user or not verify_password(payload.mot_de_passe, user.mot_de_passe):
        raise HTTPException(401, "Email ou mot de passe incorrect")
    if not user.is_active:
        raise HTTPException(403, "Votre compte a été désactivé")
    return {"access_token": create_access_token({"sub": str(user.id)}), "user": user}


@router.get("/moi", response_model=UserOut)
def moi(user: User = Depends(get_current_user)):
    return user


@router.patch("/moi", response_model=UserOut)
def modifier_profil(payload: UserUpdate, db: Session = Depends(get_db),
                    user: User = Depends(get_current_user)):
    if payload.nom:
        user.nom = payload.nom
    if payload.telephone is not None:
        user.telephone = payload.telephone
    if payload.departement is not None and isinstance(user, (RessourceHumaine, Admin)):
        user.departement = payload.departement
    db.commit(); db.refresh(user)
    return user


@router.post("/moi/changer-mot-de-passe")
def changer_mot_de_passe(payload: PasswordChange, db: Session = Depends(get_db),
                          user: User = Depends(get_current_user)):
    if not verify_password(payload.mot_de_passe_actuel, user.mot_de_passe):
        raise HTTPException(400, "Mot de passe actuel incorrect")
    user.mot_de_passe = hash_password(payload.nouveau_mot_de_passe)
    db.commit()
    return {"message": "Mot de passe modifié"}


@router.patch("/moi/cal", response_model=UserOut)
def sauver_cal(payload: RHSettings, db: Session = Depends(get_db),
               user: User = Depends(get_current_user)):
    if not isinstance(user, RessourceHumaine):
        raise HTTPException(403, "Réservé aux RH")
    if payload.cal_link    is not None: user.cal_link    = payload.cal_link    or None
    if payload.cal_api_key is not None: user.cal_api_key = payload.cal_api_key or None
    db.commit(); db.refresh(user)
    return user

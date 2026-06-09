import random, string
from datetime import datetime, timedelta
from jose import jwt, JWTError
from fastapi import Depends, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.formation import Employe
from app.core.config import get_settings

settings = get_settings()
bearer   = HTTPBearer()

ROLE_EMPLOYE   = "employe"
ROLE_FORMATEUR = "formateur"


def generer_code(role: str = ROLE_EMPLOYE) -> str:
    prefix = "FORM" if role == ROLE_FORMATEUR else "EMP"
    suffix = "".join(random.choices(string.ascii_uppercase + string.digits, k=4))
    return f"{prefix}-{suffix}"


def creer_token(employe_id: int, role: str) -> str:
    exp = datetime.utcnow() + timedelta(days=settings.ACCESS_TOKEN_EXPIRE_DAYS)
    return jwt.encode(
        {"sub": str(employe_id), "role": role, "exp": exp, "app": "formation"},
        settings.SECRET_KEY,
        algorithm=settings.ALGORITHM,
    )


def get_employe(
    token: HTTPAuthorizationCredentials = Depends(bearer),
    db:    Session                       = Depends(get_db),
) -> Employe:
    try:
        payload = jwt.decode(
            token.credentials, settings.SECRET_KEY,
            algorithms=[settings.ALGORITHM],
        )
        if payload.get("app") != "formation":
            raise HTTPException(401, "Token invalide pour cette application")
        emp_id = int(payload["sub"])
    except (JWTError, KeyError, ValueError):
        raise HTTPException(401, "Token invalide ou expiré")

    emp = db.get(Employe, emp_id)
    if not emp:
        raise HTTPException(401, "Compte introuvable")
    if not emp.is_active:
        raise HTTPException(403, "Compte désactivé")
    return emp


def require_formateur(emp: Employe = Depends(get_employe)) -> Employe:
    if emp.role != ROLE_FORMATEUR:
        raise HTTPException(403, "Accès réservé aux formateurs")
    return emp

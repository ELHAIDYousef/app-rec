from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.formation import Employe
from app.routers.formation.schemas import LoginIn, EmployeOut
from app.routers.formation.formation_auth import creer_token, get_employe

router = APIRouter(prefix="/api/formation/auth", tags=["Formation — Auth"])


@router.post("/login")
def login(payload: LoginIn, db: Session = Depends(get_db)):
    emp = db.query(Employe).filter(
        Employe.code_employe == payload.code.strip().upper()
    ).first()
    if not emp:
        raise HTTPException(401, "Code d'accès invalide")
    if not emp.is_active:
        raise HTTPException(403, "Compte désactivé — contactez votre formateur")
    return {
        "access_token": creer_token(emp.id, emp.role),
        "employe": {
            "id":   emp.id,
            "nom":  emp.nom,
            "code": emp.code_employe,
            "role": emp.role,
        },
    }


@router.get("/moi", response_model=EmployeOut)
def moi(emp: Employe = Depends(get_employe)):
    return EmployeOut(
        id=emp.id, nom=emp.nom,
        code=emp.code_employe, role=emp.role,
    )

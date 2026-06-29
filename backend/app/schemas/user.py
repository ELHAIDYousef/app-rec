from pydantic import BaseModel, EmailStr, field_validator
from typing import Optional
from datetime import datetime
from app.models.user import UserRole
import re


def _valider_mot_de_passe(v: str) -> str:
    if len(v) < 8:
        raise ValueError("Le mot de passe doit contenir au moins 8 caractères")
    if not re.search(r"[A-Z]", v):
        raise ValueError("Le mot de passe doit contenir au moins une majuscule")
    if not re.search(r"[0-9]", v):
        raise ValueError("Le mot de passe doit contenir au moins un chiffre")
    return v


class UserOut(BaseModel):
    id:          int
    nom:         str
    email:       str
    role:        str
    is_active:   bool
    cree_le:     Optional[datetime] = None
    telephone:   Optional[str] = None
    # RH
    departement:    Optional[str] = None
    cal_link:       Optional[str] = None
    cal_configured: bool          = False
    # Encadrant / Stagiaire
    specialite:  Optional[str] = None
    # Stagiaire
    universite:  Optional[str] = None
    niveau:      Optional[str] = None

    model_config = {"from_attributes": True}


class UserRegister(BaseModel):
    nom:          str
    email:        EmailStr
    mot_de_passe: str

    @field_validator("nom")
    @classmethod
    def nom_valide(cls, v):
        v = v.strip()
        if not v:
            raise ValueError("Le nom ne peut pas être vide")
        if len(v) < 2:
            raise ValueError("Le nom doit contenir au moins 2 caractères")
        if re.search(r"[0-9]", v):
            raise ValueError("Le nom ne peut pas contenir de chiffres")
        if re.search(r"[^a-zA-ZÀ-ÿ\s\-\']", v):
            raise ValueError("Le nom ne peut contenir que des lettres, espaces, tirets et apostrophes")
        return v

    @field_validator("mot_de_passe")
    @classmethod
    def mot_de_passe_valide(cls, v):
        return _valider_mot_de_passe(v)


class UserLogin(BaseModel):
    email:        EmailStr
    mot_de_passe: str


class TokenOut(BaseModel):
    access_token: str
    token_type:   str = "bearer"
    user:         UserOut


class UserCreate(BaseModel):
    nom:          str
    email:        EmailStr
    mot_de_passe: str
    role:         UserRole = UserRole.rh
    departement:  Optional[str] = None
    specialite:   Optional[str] = None

    @field_validator("nom")
    @classmethod
    def nom_valide(cls, v):
        if v is None:
            return v
        v = v.strip()
        if len(v) < 2:
            raise ValueError("Le nom doit contenir au moins 2 caractères")
        if re.search(r"[0-9]", v):
            raise ValueError("Le nom ne peut pas contenir de chiffres")
        if re.search(r"[^a-zA-ZÀ-ÿ\s\-\']", v):
            raise ValueError("Le nom ne peut contenir que des lettres, espaces, tirets et apostrophes")
        return v

    @field_validator("mot_de_passe")
    @classmethod
    def mot_de_passe_valide(cls, v):
        return _valider_mot_de_passe(v)


class UserUpdate(BaseModel):
    nom:         Optional[str] = None
    telephone:   Optional[str] = None
    departement: Optional[str] = None
    universite:  Optional[str] = None
    niveau:      Optional[str] = None
    specialite:  Optional[str] = None

    @field_validator("nom")
    @classmethod
    def nom_valide(cls, v):
        if v is None:
            return v
        v = v.strip()
        if len(v) < 2:
            raise ValueError("Le nom doit contenir au moins 2 caractères")
        if re.search(r"[0-9]", v):
            raise ValueError("Le nom ne peut pas contenir de chiffres")
        if re.search(r"[^a-zA-ZÀ-ÿ\s\-\']", v):
            raise ValueError("Le nom ne peut contenir que des lettres, espaces, tirets et apostrophes")
        return v


class PasswordChange(BaseModel):
    mot_de_passe_actuel:  str
    nouveau_mot_de_passe: str

    @field_validator("nouveau_mot_de_passe")
    @classmethod
    def nouveau_mot_de_passe_valide(cls, v):
        return _valider_mot_de_passe(v)


class RHSettings(BaseModel):
    cal_link:    Optional[str] = None
    cal_api_key: Optional[str] = None

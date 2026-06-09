from pydantic import BaseModel, EmailStr, field_validator
from typing import Optional
from datetime import datetime
from app.models.user import UserRole
import re

class UserOut(BaseModel):
    id:          int
    nom:         str
    email:       str
    role:        UserRole
    is_active:   bool
    cree_le:     Optional[datetime] = None
    # Candidat uniquement
    telephone:   Optional[str] = None
    # RH uniquement
    departement: Optional[str] = None
    cal_link:    Optional[str] = None
    cal_api_key: Optional[str] = None

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


class UserUpdate(BaseModel):
    nom:         Optional[str] = None
    telephone:   Optional[str] = None
    departement: Optional[str] = None

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


class RHSettings(BaseModel):
    cal_link:    Optional[str] = None
    cal_api_key: Optional[str] = None

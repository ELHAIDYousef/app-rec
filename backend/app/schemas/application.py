from pydantic import BaseModel, field_validator
from typing import Optional, Any
from datetime import datetime
from app.models.application import StatutCandidature


class CandidatureCreate(BaseModel):
    offre_id:   int
    motivation: str

    @field_validator("motivation")
    @classmethod
    def not_empty(cls, v):
        if not v.strip():
            raise ValueError("La lettre de motivation ne peut pas être vide")
        return v.strip()


class StatutUpdate(BaseModel):
    statut: StatutCandidature


class CandidatureOut(BaseModel):
    id:             int
    offre_id:       int
    user_id:        int
    motivation:     str
    cv_fichier:     Optional[str]
    statut:         StatutCandidature
    score_nlp:      Optional[int]
    score_groq:     Optional[int]
    analyse_nlp:    Optional[Any]
    analyse_groq:   Optional[Any]
    postule_le:     Optional[datetime]
    traite_par:         Optional[int]      = None
    statut_modifie_le:  Optional[datetime] = None
    # Calculés
    nom_candidat:       Optional[str] = None
    email_candidat:     Optional[str] = None
    telephone_candidat: Optional[str] = None
    titre_offre:        Optional[str] = None
    nom_traite_par:     Optional[str] = None

    model_config = {"from_attributes": True}


class CandidatureCandidat(BaseModel):
    id:             int
    offre_id:       int
    motivation:     str
    cv_fichier:     Optional[str]
    statut:         StatutCandidature
    score_nlp:      Optional[int]
    postule_le:     Optional[datetime]
    titre_offre:    Optional[str] = None

    model_config = {"from_attributes": True}

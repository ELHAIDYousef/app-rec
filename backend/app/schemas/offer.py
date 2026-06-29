from pydantic import BaseModel, field_validator, model_validator
from typing import Optional, List
from datetime import date, datetime
from app.models.offer import StatutOffre


class OffreCreate(BaseModel):
    titre:       str
    description: str
    competences: List[str] = []
    date_debut:  date
    date_fin:    date
    statut:      StatutOffre = StatutOffre.ouverte

    @field_validator("titre")
    @classmethod
    def titre_non_vide(cls, v):
        if not v.strip():
            raise ValueError("Le titre ne peut pas être vide")
        return v.strip()

    @model_validator(mode="after")
    def verifier_dates(self):
        if self.date_fin < self.date_debut:
            raise ValueError("La date de fin doit être postérieure à la date de début")
        return self


class OffreUpdate(BaseModel):
    titre:       Optional[str]           = None
    description: Optional[str]           = None
    competences: Optional[List[str]]     = None
    date_debut:  Optional[date]          = None
    date_fin:    Optional[date]          = None
    statut:      Optional[StatutOffre]   = None

    @model_validator(mode="after")
    def verifier_dates(self):
        if self.date_debut is not None and self.date_fin is not None:
            if self.date_fin < self.date_debut:
                raise ValueError("La date de fin doit être postérieure à la date de début")
        return self


class OffreOut(BaseModel):
    id:                  int
    titre:               str
    description:         str
    competences:         List[str]
    date_debut:          date
    date_fin:            date
    statut:              StatutOffre
    cree_par:            int
    cree_le:             Optional[datetime]
    nb_candidatures:     Optional[int] = 0
    nom_createur:        Optional[str] = None

    model_config = {"from_attributes": True}

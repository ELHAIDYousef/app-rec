from pydantic import BaseModel, field_validator
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

    @field_validator("date_fin")
    @classmethod
    def fin_apres_debut(cls, v, info):
        if "date_debut" in info.data and v < info.data["date_debut"]:
            raise ValueError("La date de fin doit être après la date de début")
        return v


class OffreUpdate(BaseModel):
    titre:       Optional[str]           = None
    description: Optional[str]           = None
    competences: Optional[List[str]]     = None
    date_debut:  Optional[date]          = None
    date_fin:    Optional[date]          = None
    statut:      Optional[StatutOffre]   = None


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

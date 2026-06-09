from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime


# ── Auth ──────────────────────────────────────────────────

class LoginIn(BaseModel):
    code: str

class EmployeOut(BaseModel):
    id:       int
    nom:      str
    code:     str
    role:     str

    model_config = {"from_attributes": True}


# ── Employé CRUD ──────────────────────────────────────────

class EmployeIn(BaseModel):
    nom: str = Field(..., min_length=2)

class EmployeListOut(BaseModel):
    id:          int
    nom:         str
    code_employe:str
    role:        str
    is_active:   int
    cree_le:     Optional[datetime] = None

    model_config = {"from_attributes": True}


# ── Formation ─────────────────────────────────────────────

class FormationListOut(BaseModel):
    id:          int
    titre:       str
    nb_questions:int
    cree_le:     Optional[datetime] = None

    model_config = {"from_attributes": True}


# ── Question ──────────────────────────────────────────────

class QuestionOut(BaseModel):
    id:           int
    type:         str
    question:     str
    options:      Optional[List[str]] = None
    bonne_reponse:str
    ordre:        int

    model_config = {"from_attributes": True}

class QuestionsFormationOut(BaseModel):
    formation: str
    questions: List[QuestionOut]


# ── Test ──────────────────────────────────────────────────

class QuestionTestOut(BaseModel):
    id:      int
    type:    str
    question:str
    options: Optional[List[str]] = None
    ordre:   int

    model_config = {"from_attributes": True}

class SoumettreIn(BaseModel):
    reponses:  List[str]
    duree_min: int = 0

class SoumettreOut(BaseModel):
    resultat_id: int
    note:        int
    corrections: List[dict]


# ── Résultat ──────────────────────────────────────────────

class ResultatListOut(BaseModel):
    id:       int
    formation:str
    note:     int
    duree_min:Optional[int] = None
    passe_le: Optional[datetime] = None

class ResultatDetailOut(BaseModel):
    id:         int
    note:       int
    reponses:   List[str]
    corrections:Optional[List[dict]] = None
    duree_min:  Optional[int] = None
    passe_le:   Optional[datetime] = None

    model_config = {"from_attributes": True}

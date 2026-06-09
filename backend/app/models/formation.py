from sqlalchemy import Column, Integer, String, Text, JSON, Enum, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base


class Employe(Base):
    __tablename__ = "employes"

    id           = Column(Integer, primary_key=True, index=True)
    nom          = Column(String(120), nullable=False)
    code_employe = Column(String(20), unique=True, nullable=False)
    role         = Column(Enum("employe", "formateur"), nullable=False, default="employe")
    is_active    = Column(Integer, default=1)
    cree_le      = Column(DateTime(timezone=True), server_default=func.now())

    formations = relationship("Formation", back_populates="createur")
    resultats  = relationship("Resultat",  back_populates="employe")


class Formation(Base):
    __tablename__ = "formations"

    id          = Column(Integer, primary_key=True, index=True)
    titre       = Column(String(200), nullable=False)
    contenu     = Column(Text, nullable=True)
    pdf_fichier = Column(String(255), nullable=True)
    cree_par    = Column(Integer, ForeignKey("employes.id"), nullable=False)
    cree_le     = Column(DateTime(timezone=True), server_default=func.now())

    createur  = relationship("Employe",  back_populates="formations")
    questions = relationship("Question", back_populates="formation", cascade="all, delete-orphan")
    resultats = relationship("Resultat", back_populates="formation")


class Question(Base):
    __tablename__ = "questions"

    id            = Column(Integer, primary_key=True, index=True)
    formation_id  = Column(Integer, ForeignKey("formations.id", ondelete="CASCADE"), nullable=False)
    type          = Column(Enum("qcm", "ouverte"), nullable=False)
    question      = Column(Text, nullable=False)
    options       = Column(JSON, nullable=True)
    bonne_reponse = Column(Text, nullable=False)
    ordre         = Column(Integer, default=0)

    formation = relationship("Formation", back_populates="questions")


class Resultat(Base):
    __tablename__ = "resultats"

    id           = Column(Integer, primary_key=True, index=True)
    employe_id   = Column(Integer, ForeignKey("employes.id",   ondelete="CASCADE"), nullable=False)
    formation_id = Column(Integer, ForeignKey("formations.id", ondelete="CASCADE"), nullable=False)
    note         = Column(Integer, default=0)
    reponses     = Column(JSON, nullable=False)
    corrections  = Column(JSON, nullable=True)
    duree_min    = Column(Integer, nullable=True)
    passe_le     = Column(DateTime(timezone=True), server_default=func.now())

    employe   = relationship("Employe",   back_populates="resultats")
    formation = relationship("Formation", back_populates="resultats")

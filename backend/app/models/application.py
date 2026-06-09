from sqlalchemy import Column, Integer, String, Text, DateTime, Enum, ForeignKey, SmallInteger, JSON
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import enum
from app.core.database import Base


class StatutCandidature(str, enum.Enum):
    en_attente  = "en_attente"
    examinee    = "examinee"
    selectionne = "selectionne"
    refusee     = "refusee"
    embauche    = "embauche"


class Application(Base):
    __tablename__ = "candidatures"

    id                  = Column(Integer, primary_key=True, index=True)
    offre_id            = Column(Integer, ForeignKey("offres.id", ondelete="CASCADE"), nullable=False)
    user_id             = Column(Integer, ForeignKey("utilisateurs.id"), nullable=False)
    motivation          = Column(Text, nullable=False)
    cv_fichier          = Column(String(255), nullable=True)
    statut              = Column(Enum(StatutCandidature), nullable=False, default=StatutCandidature.en_attente)
    score_nlp           = Column(SmallInteger, nullable=True)
    score_groq          = Column(SmallInteger, nullable=True)
    analyse_nlp         = Column(JSON, nullable=True)
    analyse_groq        = Column(JSON, nullable=True)
    traite_par          = Column(Integer, ForeignKey("utilisateurs.id", ondelete="SET NULL"), nullable=True)
    statut_modifie_le   = Column(DateTime(timezone=True), nullable=True)
    postule_le          = Column(DateTime(timezone=True), server_default=func.now())

    offre           = relationship("Offre", back_populates="applications")
    candidat        = relationship("User", back_populates="applications", foreign_keys=[user_id])
    traite_par_user = relationship("User", foreign_keys=[traite_par])

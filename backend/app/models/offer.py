from sqlalchemy import Column, Integer, String, Text, Date, DateTime, Enum, ForeignKey, JSON
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import enum
from app.core.database import Base


class StatutOffre(str, enum.Enum):
    ouverte = "ouverte"
    fermee  = "fermee"


class Offre(Base):
    __tablename__ = "offres"

    id          = Column(Integer, primary_key=True, index=True)
    titre       = Column(String(200), nullable=False)
    description = Column(Text, nullable=False)
    competences = Column(JSON, nullable=False, default=list)
    date_debut  = Column(Date, nullable=False)
    date_fin    = Column(Date, nullable=False)
    statut      = Column(Enum(StatutOffre), nullable=False, default=StatutOffre.ouverte)
    cree_par    = Column(Integer, ForeignKey("utilisateurs.id"), nullable=False)
    cree_le     = Column(DateTime(timezone=True), server_default=func.now())

    cree_par_user = relationship("User", back_populates="offres")
    applications  = relationship("Application", back_populates="offre", cascade="all, delete-orphan")

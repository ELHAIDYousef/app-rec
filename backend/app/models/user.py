from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import enum
from app.core.database import Base


class UserRole(str, enum.Enum):
    candidat  = "candidat"
    rh        = "rh"
    admin     = "admin"
    encadrant = "encadrant"
    stagiaire = "stagiaire"


class User(Base):
    __tablename__ = "utilisateurs"

    id           = Column(Integer, primary_key=True, index=True)
    nom          = Column(String(120), nullable=False)
    email        = Column(String(180), unique=True, index=True, nullable=False)
    mot_de_passe = Column(String(255), nullable=False)
    role         = Column(String(20), nullable=False, default="candidat")
    is_active    = Column(Boolean, default=True, nullable=False)
    telephone    = Column(String(30), nullable=True)
    cree_le      = Column(DateTime(timezone=True), server_default=func.now())

    __mapper_args__ = {
        "polymorphic_on":       role,
        "polymorphic_identity": None,
    }

    applications  = relationship("Application",  back_populates="candidat", foreign_keys="Application.user_id")
    offres        = relationship("Offre",         back_populates="cree_par_user")
    notifications = relationship("Notification",  back_populates="user")


class Candidat(User):
    __tablename__ = "candidats"

    id = Column(Integer, ForeignKey("utilisateurs.id"), primary_key=True)

    __mapper_args__ = {"polymorphic_identity": "candidat"}


class RessourceHumaine(User):
    __tablename__ = "ressources_humaines"

    id          = Column(Integer, ForeignKey("utilisateurs.id"), primary_key=True)
    departement = Column(String(120), nullable=True)
    cal_link    = Column(String(500), nullable=True)
    cal_api_key = Column(String(500), nullable=True)

    @property
    def cal_configured(self) -> bool:
        return bool(self.cal_api_key)

    __mapper_args__ = {"polymorphic_identity": "rh"}


class Admin(User):
    __tablename__ = "admins"

    id          = Column(Integer, ForeignKey("utilisateurs.id"), primary_key=True)
    departement = Column(String(120), nullable=True)

    __mapper_args__ = {"polymorphic_identity": "admin"}


class Encadrant(User):
    __tablename__ = "encadrants"

    id          = Column(Integer, ForeignKey("utilisateurs.id"), primary_key=True)
    specialite  = Column(String(120), nullable=True)
    departement = Column(String(120), nullable=True)

    __mapper_args__ = {"polymorphic_identity": "encadrant"}


class Stagiaire(User):
    __tablename__ = "stagiaires"

    id         = Column(Integer, ForeignKey("utilisateurs.id"), primary_key=True)
    universite = Column(String(200), nullable=True)
    niveau     = Column(String(50), nullable=True)   # licence / master / ingenieur
    specialite = Column(String(120), nullable=True)

    __mapper_args__ = {"polymorphic_identity": "stagiaire"}

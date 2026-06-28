from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, JSON, Boolean, Date
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base


class SujetStage(Base):
    __tablename__ = "sujets_stage"

    id            = Column(Integer, primary_key=True, index=True)
    titre         = Column(String(200), nullable=False)
    description   = Column(Text, nullable=False)
    technologies  = Column(JSON, nullable=True)   # ["Python","React",...]
    niveau_requis = Column(String(50), nullable=True)  # licence/master/ingenieur
    encadrant     = Column(String(120), nullable=True)
    statut        = Column(String(20), nullable=False, default="disponible")
    cree_par      = Column(Integer, ForeignKey("utilisateurs.id", ondelete="SET NULL"), nullable=True)
    cree_le       = Column(DateTime(timezone=True), server_default=func.now())

    candidatures = relationship("CandidatureStage", back_populates="sujet")


class CandidatureStage(Base):
    __tablename__ = "candidatures_stage"

    id                  = Column(Integer, primary_key=True, index=True)
    stagiaire_id        = Column(Integer, ForeignKey("utilisateurs.id"), nullable=False)
    motivation          = Column(Text, nullable=False)
    cv_fichier          = Column(String(300), nullable=True)
    convention_fichier  = Column(String(300), nullable=True)
    statut              = Column(String(20), nullable=False, default="en_attente")
    sujet_id            = Column(Integer, ForeignKey("sujets_stage.id", ondelete="SET NULL"), nullable=True)
    message_ia          = Column(Text, nullable=True)
    cree_le             = Column(DateTime(timezone=True), server_default=func.now())

    stagiaire = relationship("User", foreign_keys=[stagiaire_id])
    sujet     = relationship("SujetStage", back_populates="candidatures")
    profil    = relationship("ProfilAnalyse", back_populates="candidature", uselist=False)
    cahier    = relationship("CahierDesCharges", back_populates="candidature", uselist=False)
    sprints   = relationship("Sprint", back_populates="candidature", order_by="Sprint.numero")


class ProfilAnalyse(Base):
    __tablename__ = "profils_analyse"

    id                      = Column(Integer, primary_key=True, index=True)
    stagiaire_id            = Column(Integer, ForeignKey("utilisateurs.id"), nullable=False)
    candidature_id          = Column(Integer, ForeignKey("candidatures_stage.id", ondelete="CASCADE"), nullable=True)
    niveau_technique        = Column(String(50), nullable=True)
    competences             = Column(JSON, nullable=True)
    centres_interet         = Column(JSON, nullable=True)
    technologies_maitrisees = Column(JSON, nullable=True)
    domaine_recommande      = Column(String(100), nullable=True)
    resume_ia               = Column(Text, nullable=True)
    score                   = Column(Integer, nullable=True)
    cree_le                 = Column(DateTime(timezone=True), server_default=func.now())

    candidature = relationship("CandidatureStage", back_populates="profil")


class CahierDesCharges(Base):
    __tablename__ = "cahiers_charges"

    id             = Column(Integer, primary_key=True, index=True)
    stagiaire_id   = Column(Integer, ForeignKey("utilisateurs.id"), nullable=False)
    candidature_id = Column(Integer, ForeignKey("candidatures_stage.id", ondelete="CASCADE"), nullable=True)
    sujet_id       = Column(Integer, ForeignKey("sujets_stage.id", ondelete="SET NULL"), nullable=True)
    contenu        = Column(JSON, nullable=True)
    statut         = Column(String(20), nullable=False, default="genere")
    cree_le        = Column(DateTime(timezone=True), server_default=func.now())

    sujet       = relationship("SujetStage")
    candidature = relationship("CandidatureStage", back_populates="cahier")


class Sprint(Base):
    __tablename__ = "sprints"

    id             = Column(Integer, primary_key=True, index=True)
    candidature_id = Column(Integer, ForeignKey("candidatures_stage.id", ondelete="CASCADE"), nullable=False)
    numero         = Column(Integer, nullable=False)
    titre          = Column(String(200), nullable=False)
    objectif       = Column(Text, nullable=True)
    date_debut     = Column(Date, nullable=True)
    date_fin       = Column(Date, nullable=True)
    statut         = Column(String(20), nullable=False, default="planifie")
    cree_le        = Column(DateTime(timezone=True), server_default=func.now())

    candidature = relationship("CandidatureStage", back_populates="sprints")
    taches      = relationship("Tache", back_populates="sprint", order_by="Tache.ordre")
    reports     = relationship("DailyReport", back_populates="sprint")


class Tache(Base):
    __tablename__ = "taches_scrum"

    id           = Column(Integer, primary_key=True, index=True)
    sprint_id    = Column(Integer, ForeignKey("sprints.id", ondelete="CASCADE"), nullable=False)
    stagiaire_id = Column(Integer, ForeignKey("utilisateurs.id"), nullable=False)
    titre        = Column(String(255), nullable=False)
    description  = Column(Text, nullable=True)
    statut       = Column(String(20), nullable=False, default="a_faire")
    priorite     = Column(Integer, default=1)
    ordre        = Column(Integer, default=0)
    cree_le      = Column(DateTime(timezone=True), server_default=func.now())

    sprint = relationship("Sprint", back_populates="taches")


class DailyReport(Base):
    __tablename__ = "daily_reports"

    id           = Column(Integer, primary_key=True, index=True)
    stagiaire_id = Column(Integer, ForeignKey("utilisateurs.id"), nullable=False)
    sprint_id    = Column(Integer, ForeignKey("sprints.id", ondelete="CASCADE"), nullable=False)
    date         = Column(Date, nullable=False)
    realise      = Column(Text, nullable=False)
    difficultes  = Column(Text, nullable=True)
    prevu        = Column(Text, nullable=False)
    cree_le      = Column(DateTime(timezone=True), server_default=func.now())

    sprint = relationship("Sprint", back_populates="reports")


class MessageAssistant(Base):
    __tablename__ = "messages_assistant"

    id           = Column(Integer, primary_key=True, index=True)
    stagiaire_id = Column(Integer, ForeignKey("utilisateurs.id"), nullable=False)
    canal        = Column(String(20), nullable=False, default="chat")  # chat/email/whatsapp
    role         = Column(String(10), nullable=False)  # user / assistant
    contenu      = Column(Text, nullable=False)
    cree_le      = Column(DateTime(timezone=True), server_default=func.now())

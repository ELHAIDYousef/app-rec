from sqlalchemy import Column, Integer, Text, Boolean, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base


class Notification(Base):
    __tablename__ = "notifications"

    id              = Column(Integer, primary_key=True, index=True)
    user_id         = Column(Integer, ForeignKey("utilisateurs.id"), nullable=False)
    message         = Column(Text, nullable=False)
    candidature_id  = Column(Integer, ForeignKey("candidatures.id", ondelete="SET NULL"), nullable=True)
    lue             = Column(Boolean, default=False, nullable=False)
    cree_le         = Column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User", back_populates="notifications")

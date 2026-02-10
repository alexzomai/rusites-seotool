from sqlalchemy import Column, Integer, String
from sqlalchemy.orm import relationship

from src.models.base import Base


class Media(Base):
    __tablename__ = "medias"

    id = Column(Integer, primary_key=True)

    system_id = Column(String, index=True, unique=True)
    domain = Column(String)
    title = Column(String)

    stats = relationship("Stat", back_populates="media", cascade="all, delete-orphan")

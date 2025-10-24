from enum import Enum

from sqlalchemy import BigInteger, Column, Date, DateTime, ForeignKey, Integer, String, event
from sqlalchemy import Enum as SQLEnum
from sqlalchemy.orm import relationship
from src.models.base import Base
from datetime import date


class Stat(Base):
    __tablename__ = "stats"

    id = Column(Integer, primary_key=True)
    media_id = Column(Integer, ForeignKey("medias.id", ondelete="CASCADE"))

    visits = Column(BigInteger)
    rating = Column(Integer)
    parse_date = Column(Date, index=True, default=date.today)

    media = relationship("Media", back_populates="stats")

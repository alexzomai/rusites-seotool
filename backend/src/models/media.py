from typing import TYPE_CHECKING

from sqlalchemy import String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from src.models.base import Base

if TYPE_CHECKING:
    from src.models.stat import Stat


class Media(Base):
    __tablename__ = "medias"

    id: Mapped[int] = mapped_column(primary_key=True)

    system_id: Mapped[str] = mapped_column(String, index=True, unique=True)
    domain: Mapped[str | None] = mapped_column(String)
    title: Mapped[str | None] = mapped_column(String)

    stats: Mapped[list["Stat"]] = relationship(back_populates="media", cascade="all, delete-orphan")

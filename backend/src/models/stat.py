from datetime import date
from typing import TYPE_CHECKING

from sqlalchemy import BigInteger, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship

from src.models.base import Base

if TYPE_CHECKING:
    from src.models.media import Media


class Stat(Base):
    __tablename__ = "stats"

    id: Mapped[int] = mapped_column(primary_key=True)
    media_id: Mapped[int] = mapped_column(ForeignKey("medias.id", ondelete="CASCADE"))

    visits: Mapped[int | None] = mapped_column(BigInteger)
    rating: Mapped[int | None]
    parse_date: Mapped[date] = mapped_column(index=True, default=date.today)

    media: Mapped["Media"] = relationship(back_populates="stats")

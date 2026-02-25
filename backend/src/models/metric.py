from typing import TYPE_CHECKING

from sqlalchemy import BigInteger, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship

from src.models.base import Base, TimestampMixin

if TYPE_CHECKING:
    from src.models.site import Site


class Metric(Base, TimestampMixin):
    __tablename__ = "metrics"

    id: Mapped[int] = mapped_column(primary_key=True)
    site_id: Mapped[int] = mapped_column(ForeignKey("sites.id", ondelete="CASCADE"), index=True)

    visits: Mapped[int | None] = mapped_column(BigInteger)

    site: Mapped["Site"] = relationship(back_populates="metrics")

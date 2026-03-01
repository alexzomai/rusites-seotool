from typing import TYPE_CHECKING

from sqlalchemy import ForeignKey, Index, Integer, text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from src.models.base import Base, TimestampMixin

if TYPE_CHECKING:
    from src.models.site import Site


class Metric(Base, TimestampMixin):
    __tablename__ = "metrics"
    __table_args__ = (
        Index("ix_metric_site_date", "site_id", text("date(created_at)")),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    site_id: Mapped[int] = mapped_column(ForeignKey("sites.id", ondelete="CASCADE"), index=True)

    visits: Mapped[int | None] = mapped_column(Integer)

    site: Mapped["Site"] = relationship(back_populates="metrics")

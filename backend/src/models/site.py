from typing import TYPE_CHECKING

from sqlalchemy import String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from src.models.base import Base, TimestampMixin

if TYPE_CHECKING:
    from src.models.metric import Metric


class Site(Base, TimestampMixin):
    __tablename__ = "sites"

    id: Mapped[int] = mapped_column(primary_key=True)

    system_id: Mapped[str] = mapped_column(String, index=True, unique=True)
    domain: Mapped[str | None] = mapped_column(String)
    title: Mapped[str | None] = mapped_column(String)

    metrics: Mapped[list["Metric"]] = relationship(back_populates="site", cascade="all, delete-orphan")

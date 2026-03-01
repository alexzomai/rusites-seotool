from typing import TYPE_CHECKING

from sqlalchemy import Index, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from src.models.base import Base, TimestampMixin

if TYPE_CHECKING:
    from src.models.metric import Metric


class Site(Base, TimestampMixin):
    __tablename__ = "sites"
    __table_args__ = (
        Index("ix_site_title_trgm", "title", postgresql_using="gin", postgresql_ops={"title": "gin_trgm_ops"}),
        Index("ix_site_slug_trgm", "slug", postgresql_using="gin", postgresql_ops={"slug": "gin_trgm_ops"}),
    )

    id: Mapped[int] = mapped_column(primary_key=True)

    slug: Mapped[str] = mapped_column(String(255), index=True, unique=True)
    domain: Mapped[str | None] = mapped_column(String(255), index=True)
    title: Mapped[str | None] = mapped_column(String(500))
    hidden: Mapped[bool] = mapped_column(default=False, server_default="false")

    metrics: Mapped[list["Metric"]] = relationship(back_populates="site", cascade="all, delete-orphan")

import datetime

from sqlalchemy import text
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column


class Base(DeclarativeBase):
    pass


class TimestampMixin:
    """Миксин для добавления полей created_at и updated_at"""

    created_at: Mapped[datetime.datetime] = mapped_column(server_default=text("TIMEZONE('utc', now()::timestamp)"))
    updated_at: Mapped[datetime.datetime] = mapped_column(
        server_default=text("TIMEZONE('utc', now()::timestamp)"),
        onupdate=lambda: datetime.datetime.now(datetime.UTC).replace(tzinfo=None),
    )

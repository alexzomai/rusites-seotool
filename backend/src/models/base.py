import datetime
import zoneinfo

from sqlalchemy import text
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column

MOSCOW_TZ = zoneinfo.ZoneInfo("Europe/Moscow")


class Base(DeclarativeBase):
    pass


class TimestampMixin:
    """Миксин для добавления полей created_at и updated_at"""

    created_at: Mapped[datetime.datetime] = mapped_column(server_default=text("(now() AT TIME ZONE 'Europe/Moscow')"))
    updated_at: Mapped[datetime.datetime] = mapped_column(
        server_default=text("(now() AT TIME ZONE 'Europe/Moscow')"),
        onupdate=lambda: datetime.datetime.now(MOSCOW_TZ).replace(tzinfo=None),
    )

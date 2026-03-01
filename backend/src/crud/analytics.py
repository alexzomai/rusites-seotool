import datetime
import zoneinfo

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from src.models.metric import Metric


async def get_top_sites_today(db: AsyncSession, limit: int = 100) -> list[Metric]:
    today = datetime.datetime.now(zoneinfo.ZoneInfo("Europe/Moscow")).date()
    result = await db.execute(
        select(Metric)
        .where(func.date(Metric.created_at) == today)
        .order_by(Metric.visits.desc())
        .limit(limit)
        .options(selectinload(Metric.site))
    )
    return list(result.scalars().all())

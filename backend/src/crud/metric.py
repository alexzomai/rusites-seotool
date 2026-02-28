import datetime

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from src.models.metric import Metric


async def get_metric(db: AsyncSession, metric_id: int) -> Metric | None:
    result = await db.execute(select(Metric).where(Metric.id == metric_id))
    return result.scalar_one_or_none()


async def get_metrics_by_site(db: AsyncSession, site_id: int, skip: int = 0, limit: int = 100) -> list[Metric]:
    result = await db.execute(select(Metric).where(Metric.site_id == site_id).offset(skip).limit(limit))
    return list(result.scalars().all())


async def create_metric(db: AsyncSession, site_id: int, visits: int | None = None) -> Metric:
    metric = Metric(site_id=site_id, visits=visits)
    db.add(metric)
    await db.commit()
    await db.refresh(metric)
    return metric


async def update_metric(db: AsyncSession, metric_id: int, **kwargs) -> Metric | None:
    result = await db.execute(select(Metric).where(Metric.id == metric_id))
    metric = result.scalar_one_or_none()
    if not metric:
        return None
    for key, value in kwargs.items():
        setattr(metric, key, value)
    await db.commit()
    await db.refresh(metric)
    return metric


async def upsert_metric(db: AsyncSession, site_id: int, visits: int | None = None) -> tuple[Metric, bool]:
    """Returns (metric, created) where created=True if a new record was inserted."""
    today = datetime.datetime.now(datetime.UTC).date()
    result = await db.execute(
        select(Metric).where(
            Metric.site_id == site_id,
            func.date(Metric.created_at) == today,
        )
    )
    metric = result.scalar_one_or_none()
    if metric:
        metric.visits = visits
        await db.commit()
        await db.refresh(metric)
        return metric, False
    return await create_metric(db, site_id=site_id, visits=visits), True


async def delete_metric(db: AsyncSession, metric_id: int) -> bool:
    result = await db.execute(select(Metric).where(Metric.id == metric_id))
    metric = result.scalar_one_or_none()
    if not metric:
        return False
    await db.delete(metric)
    await db.commit()
    return True

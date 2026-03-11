import datetime
import zoneinfo

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from src.models.metric import Metric

_WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]


async def _resolve_latest_date(db: AsyncSession) -> datetime.date:
    """Return today's date if data exists for it, otherwise fall back to yesterday."""
    today = datetime.datetime.now(zoneinfo.ZoneInfo("Europe/Moscow")).date()
    has_today = (await db.execute(select(func.count()).where(func.date(Metric.created_at) == today))).scalar() or 0
    if has_today:
        return today
    return today - datetime.timedelta(days=1)


async def get_site_analytics(db: AsyncSession, site_id: int) -> dict[str, object]:
    today = await _resolve_latest_date(db)
    week_ago = today - datetime.timedelta(days=7)

    visits_today: int | None = (
        await db.execute(select(Metric.visits).where(Metric.site_id == site_id, func.date(Metric.created_at) == today))
    ).scalar_one_or_none()

    visits_week_ago: int | None = (
        await db.execute(
            select(Metric.visits).where(Metric.site_id == site_id, func.date(Metric.created_at) == week_ago)
        )
    ).scalar_one_or_none()

    yesterday = today - datetime.timedelta(days=1)
    visits_yesterday: int | None = (
        await db.execute(
            select(Metric.visits).where(Metric.site_id == site_id, func.date(Metric.created_at) == yesterday)
        )
    ).scalar_one_or_none()

    visits_diff: int | None = None
    if visits_today is not None and visits_yesterday is not None:
        visits_diff = visits_today - visits_yesterday

    change_pct: float | None = None
    if visits_today is not None and visits_week_ago:
        change_pct = round((visits_today - visits_week_ago) / visits_week_ago * 100, 1)

    rank_today: int | None = None
    if visits_today is not None:
        above = (
            await db.execute(
                select(func.count()).where(
                    func.date(Metric.created_at) == today,
                    Metric.visits > visits_today,
                )
            )
        ).scalar() or 0
        rank_today = above + 1

    best_dow_row = (
        await db.execute(
            select(func.extract("dow", Metric.created_at).label("dow"))
            .where(Metric.site_id == site_id, Metric.visits.isnot(None))
            .group_by(func.extract("dow", Metric.created_at))
            .order_by(func.avg(Metric.visits).desc())
            .limit(1)
        )
    ).first()

    best_weekday: str | None = _WEEKDAYS[int(best_dow_row.dow)] if best_dow_row else None

    return {
        "visits_today": visits_today,
        "visits_diff": visits_diff,
        "change_pct": change_pct,
        "rank_today": rank_today,
        "best_weekday": best_weekday,
    }


async def get_top_sites_today(db: AsyncSession, limit: int = 100) -> list[Metric]:
    today = await _resolve_latest_date(db)
    result = await db.execute(
        select(Metric)
        .where(func.date(Metric.created_at) == today)
        .order_by(Metric.visits.desc().nulls_last())
        .limit(limit)
        .options(selectinload(Metric.site))
    )
    return list(result.scalars().all())

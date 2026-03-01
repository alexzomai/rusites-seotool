import asyncio

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from src.crud.analytics import get_site_analytics, get_top_sites_today
from src.crud.metric import get_metrics_by_site
from src.crud.site import search_sites
from src.database import get_session
from src.schemas import SiteAnalyticsSchema, SiteMetricSchema, SiteMetricsResponseSchema, TopSiteSchema

router = APIRouter(prefix="/api", tags=["Public"])


@router.get("/sites", response_model=list[TopSiteSchema])
async def sites_search(
    q: str = Query(""),
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_session),
):
    return await search_sites(db, q=q, skip=skip, limit=limit)


@router.get("/top", response_model=list[TopSiteSchema])
async def top_sites_today(
    limit: int = Query(100, ge=1, le=1000),
    db: AsyncSession = Depends(get_session),
):
    return await get_top_sites_today(db, limit=limit)


@router.get("/{site_id}/analytics", response_model=SiteAnalyticsSchema)
async def site_analytics(
    site_id: int,
    db: AsyncSession = Depends(get_session),
):
    return await get_site_analytics(db, site_id=site_id)


@router.get("/{site_id}/metrics", response_model=SiteMetricsResponseSchema)
async def site_metrics(
    site_id: int,
    db: AsyncSession = Depends(get_session),
):
    metrics, analytics = await asyncio.gather(
        get_metrics_by_site(db, site_id=site_id),
        get_site_analytics(db, site_id=site_id),
    )
    metric_list: list[SiteMetricSchema] = []
    for i, m in enumerate(metrics):
        prev = metrics[i - 1] if i > 0 else None
        visits_diff = None
        if prev is not None and m.visits is not None and prev.visits is not None:
            visits_diff = m.visits - prev.visits
        metric_list.append(SiteMetricSchema(
            date=m.created_at.date(),
            weekday=m.created_at.strftime("%A"),
            visits=m.visits,
            visits_diff=visits_diff,
        ))
    return SiteMetricsResponseSchema(
        analytics=SiteAnalyticsSchema(**analytics),
        metrics=metric_list,
    )

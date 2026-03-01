from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from src.crud.analytics import get_top_sites_today
from src.crud.site import search_sites
from src.database import get_session
from src.schemas import SiteSchema, TopSiteSchema

router = APIRouter(prefix="/api", tags=["Public"])


@router.get("/sites", response_model=list[SiteSchema])
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

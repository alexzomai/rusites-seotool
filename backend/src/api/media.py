from fastapi import APIRouter, Depends, HTTPException

# from fastapi.responses import HTMLResponse
from sqlalchemy.ext.asyncio import AsyncSession
from src.database import get_session
from src.models.media import Media
from sqlalchemy import select
from sqlalchemy.orm import selectinload

router = APIRouter(prefix="/media", tags=["Media"])


@router.get("/{system_id}/stats")
async def get_media_stats(system_id: str, session: AsyncSession = Depends(get_session)):
    stmt = select(Media).where(Media.system_id == system_id).options(selectinload(Media.stats))
    result = await session.execute(stmt)
    media = result.scalar_one_or_none()

    if not media:
        raise HTTPException(status_code=404, detail="Media not found")

    return {
        "system_id": media.system_id,
        "domain": media.domain,
        "title": media.title,
        "stats": [
            {
                "date": s.parse_date,
                "visits": s.visits,
                "rating": s.rating,
            }
            for s in sorted(media.stats, key=lambda x: x.parse_date, reverse=True)
        ],
    }

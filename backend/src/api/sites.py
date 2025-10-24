from fastapi import APIRouter, Depends

# from fastapi.responses import HTMLResponse
from sqlalchemy.ext.asyncio import AsyncSession
from src.database import get_session
from src.models.media import Media
from sqlalchemy import select
from sqlalchemy.orm import selectinload

router = APIRouter(prefix="/sites", tags=["Sites"])


@router.get("/list")
async def list(
    session: AsyncSession = Depends(get_session),
):
    result = await session.execute(select(Media).limit(1000))
    # result = await session.execute(select(Media).limit(1000).options(selectinload(Media.stats)))

    medias = result.scalars().all()

    return medias

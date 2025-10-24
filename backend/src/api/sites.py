from fastapi import APIRouter, Request, Depends
from fastapi.responses import HTMLResponse
from sqlalchemy.ext.asyncio import AsyncSession
from src.database import get_session

router = APIRouter(prefix="/sites", tags=["Sites"])


@router.get("", response_class=HTMLResponse)
async def sites(
    session: AsyncSession = Depends(get_session),
):
    return "Hello, Russia and Israel!"

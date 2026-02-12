from fastapi import APIRouter
from src.routes.media import router as media_router
from src.routes.sites import router as sites_router

main_router = APIRouter()

main_router.include_router(sites_router)
main_router.include_router(media_router)

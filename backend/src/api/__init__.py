from fastapi import APIRouter
from src.api.sites import router as sites_router
from src.api.media import router as media_router


main_router = APIRouter()

main_router.include_router(sites_router)
main_router.include_router(media_router)

from fastapi import APIRouter
from src.api.sites import router as sites_router

main_router = APIRouter()

main_router.include_router(sites_router)

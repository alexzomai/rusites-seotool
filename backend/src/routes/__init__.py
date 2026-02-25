from fastapi import APIRouter

from src.routes.internal import router as internal_router

main_router = APIRouter()

main_router.include_router(internal_router)

from fastapi import APIRouter

from src.routes.internal import router as internal_router
from src.routes.public import router as public_router

main_router = APIRouter()

main_router.include_router(internal_router)
main_router.include_router(public_router)

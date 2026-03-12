import ipaddress
import logging

from fastapi import FastAPI, Request

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from sqlalchemy import text

from src.config import settings
from src.database import engine
from src.models import Base
from src.routes import main_router

app = FastAPI()


@app.middleware("http")
async def restrict_internal(request: Request, call_next):
    if request.url.path.startswith("/internal"):
        client_ip = request.client.host
        try:
            addr = ipaddress.ip_address(client_ip)
        except ValueError:
            return JSONResponse(status_code=403, content={"detail": "Forbidden"})
        if not addr.is_private:
            return JSONResponse(status_code=403, content={"detail": "Forbidden"})
    return await call_next(request)

# CORS
_origins = [f"https://{settings.DOMAIN}", f"http://{settings.DOMAIN}"] + settings.CORS_ORIGINS
app.add_middleware(
    CORSMiddleware,
    allow_origins=_origins,
    allow_methods=["GET"],
    allow_headers=["*"],
)


# Главная страница
@app.get("/")
async def read_root():
    return {"message": "Hello, World!"}


# Подключение к БД
@app.on_event("startup")
async def on_startup():
    async with engine.begin() as conn:
        await conn.execute(text("CREATE EXTENSION IF NOT EXISTS pg_trgm"))
        await conn.run_sync(Base.metadata.create_all)


# Роутеры
app.include_router(main_router)

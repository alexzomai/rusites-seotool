from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from src.database import engine
from src.models import Base
from src.routes import main_router

app = FastAPI()

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
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
        await conn.run_sync(Base.metadata.create_all)


# Роутеры
app.include_router(main_router)

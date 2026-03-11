from pydantic import ValidationError
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    DATABASE_URL: str = "postgresql+asyncpg://postgres:change_me@localhost:5432/db"
    DOMAIN: str = "localhost"
    CORS_ORIGINS: list[str] = []

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")


try:
    settings = Settings()
except ValidationError as e:
    print(f"Configuration error: {e}")
    raise

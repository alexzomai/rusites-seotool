"""
Генерирует случайные метрики за последние 30 дней для site_id 1–10.
Запуск: uv run src/seed_metrics.py  (из папки parser/)
Требует: asyncpg  →  uv add asyncpg
"""

import asyncio
import datetime
import os
import random
from pathlib import Path

import asyncpg
from dotenv import load_dotenv

load_dotenv(Path(__file__).parents[2] / ".env")

# SEED_DATABASE_URL имеет приоритет — используй его для запуска вне Docker.
# Пример: SEED_DATABASE_URL=postgresql://postgres:change_me@localhost:5432/db
_url = os.getenv("SEED_DATABASE_URL") or os.getenv(
    "DATABASE_URL", "postgresql+asyncpg://postgres:change_me@localhost:5432/db"
)
DSN = _url.replace("postgresql+asyncpg://", "postgresql://")

SITE_IDS = list(range(1, 100))
DAYS = 90


async def main() -> None:
    conn = await asyncpg.connect(DSN)
    today = datetime.date.today()
    inserted = skipped = 0

    for site_id in SITE_IDS:
        # базовый трафик для каждого сайта — от 500k до 3M (близко к реальным топ-сайтам)
        base = random.randint(500_000, 3_000_000)
        visits = base

        for offset in range(DAYS, 0, -1):
            day = today - datetime.timedelta(days=offset)
            existing = await conn.fetchval(
                "SELECT id FROM metrics WHERE site_id = $1 AND date(created_at) = $2",
                site_id,
                day,
            )
            if existing:
                skipped += 1
                # продвигаем visits чтобы тренд не ломался
                visits = max(100_000, int(visits * random.uniform(0.85, 1.15)))
                continue

            dt = datetime.datetime.combine(day, datetime.time(12, 0))
            await conn.execute(
                "INSERT INTO metrics (site_id, visits, created_at, updated_at) VALUES ($1, $2, $3, $3)",
                site_id,
                visits,
                dt,
            )
            inserted += 1
            # следующий день ±15% от текущего
            visits = max(100_000, int(visits * random.uniform(0.85, 1.15)))

    await conn.close()
    print(f"Готово: вставлено {inserted}, пропущено {skipped}")


if __name__ == "__main__":
    asyncio.run(main())

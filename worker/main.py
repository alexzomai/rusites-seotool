import asyncio
import csv
import requests
from io import StringIO
from datetime import date
from sqlalchemy import Column, Integer, String, Date, BigInteger, ForeignKey, select
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import declarative_base, sessionmaker, relationship

# ===============================
# CONFIG
# ===============================
# DATABASE_URL = "postgresql+asyncpg://postgres:7T!1uQ%)1IP-o:C>9Z@db:5432/db"  # имя хоста 'db' для docker-compose
DATABASE_URL = "postgresql+asyncpg://postgres:7T!1uQ%)1IP-o:C>9Z@localhost:5432/db"
BASE_URL = "https://www.liveinternet.ru/rating/ru/media/today.tsv"

# ===============================
# DB MODELS
# ===============================
Base = declarative_base()
engine = create_async_engine(DATABASE_URL, echo=False)
async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)


class Media(Base):
    __tablename__ = "medias"

    id = Column(Integer, primary_key=True)
    system_id = Column(String, unique=True, index=True)
    domain = Column(String, unique=True)
    title = Column(String)

    stats = relationship("Stat", back_populates="media", cascade="all, delete-orphan")


class Stat(Base):
    __tablename__ = "stats"

    id = Column(Integer, primary_key=True)
    media_id = Column(Integer, ForeignKey("medias.id", ondelete="CASCADE"), index=True)
    visits = Column(BigInteger)
    rating = Column(Integer)
    parse_date = Column(Date, index=True, default=date.today)

    media = relationship("Media", back_populates="stats")


# ===============================
# CORE FUNCTIONS
# ===============================
async def init_db():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)


def fetch_page(page: int, per_page: int = 1000) -> str:
    url = f"{BASE_URL}?per_page={per_page}&page={page}"
    r = requests.get(url, timeout=10)
    r.raise_for_status()
    return r.text


def parse_tsv(tsv_data: str) -> list[dict]:
    reader = csv.reader(StringIO(tsv_data), delimiter="\t")
    rows = []
    for row in reader:
        if not row or row[0].startswith("всего"):
            continue
        rows.append(
            {
                "system_id": row[0],
                "domain": row[1],
                "title": row[2] if len(row) > 2 else None,
                "visits": int(row[3]) if len(row) > 3 and row[3].isdigit() else 0,
                "rating": int(row[4]) if len(row) > 4 and row[4].isdigit() else 0,
            }
        )
    return rows


async def save_data(session: AsyncSession, records: list[dict]):
    today = date.today()

    for r in records:
        # 1. пробуем найти по system_id
        stmt = select(Media).where(Media.system_id == r["system_id"])
        res = await session.execute(stmt)
        media = res.scalar_one_or_none()

        if not media:
            # 2. если такого system_id нет — ищем по домену
            stmt_domain = select(Media).where(Media.domain == r["domain"])
            res_domain = await session.execute(stmt_domain)
            media = res_domain.scalar_one_or_none()

            if not media:
                # 3. создаём только если нет даже по домену
                media = Media(system_id=r["system_id"], domain=r["domain"], title=r["title"])
                session.add(media)
                await session.flush()
            # если есть по домену — ничего не делаем

        # 4. обновляем статистику за сегодня
        stmt_stat = select(Stat).where(Stat.media_id == media.id, Stat.parse_date == today)
        res_stat = await session.execute(stmt_stat)
        old_stat = res_stat.scalar_one_or_none()
        if old_stat:
            await session.delete(old_stat)

        stat = Stat(
            media_id=media.id,
            visits=r["visits"],
            rating=r["rating"],
            parse_date=today,
        )
        session.add(stat)

    await session.commit()


async def main():
    await init_db()

    all_rows = []
    prev_first = None

    for page in range(1, 10):
        tsv_data = fetch_page(page)
        rows = parse_tsv(tsv_data)
        if not rows or rows[0] == prev_first:
            break
        prev_first = rows[0]
        all_rows.extend(rows)

    async with async_session() as session:
        await save_data(session, all_rows)

    print(f"Сохранено {len(all_rows)} записей за {date.today()}")


if __name__ == "__main__":
    asyncio.run(main())

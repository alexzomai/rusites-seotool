from datetime import date
from sqlalchemy import Column, Integer, String, Date, BigInteger
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import declarative_base, sessionmaker

DATABASE_URL = "postgresql+asyncpg://postgres:7T!1uQ%)1IP-o:C>9Z@localhost:5432/db"

engine = create_async_engine(DATABASE_URL, echo=False)
Base = declarative_base()
async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)  # type: ignore


class MediaStat(Base):
    __tablename__ = "media_stats"
    id = Column(Integer, primary_key=True)
    media_id = Column(String, index=True)
    domain = Column(String)
    title = Column(String)
    visits = Column(BigInteger)
    rating = Column(Integer)
    type = Column(String)
    flag = Column(String)
    stat_date = Column(Date, index=True, default=date.today)


async def init_db():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)


async def save_to_db(session: AsyncSession, records: list[dict]):
    today = date.today()
    for r in records:
        record = MediaStat(**r, stat_date=today)
        session.add(record)
    await session.commit()

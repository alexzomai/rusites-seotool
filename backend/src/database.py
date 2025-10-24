from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker


DATABASE_URL = 'postgresql+asyncpg://postgres:7T!1uQ%)1IP-o:C>9Z@localhost:5432/db'

# DATABASE_URL = os.getenv("DATABASE_URL")

engine = create_async_engine(DATABASE_URL, echo=False)

AsyncSessionLocal = sessionmaker(bind=engine, class_=AsyncSession, expire_on_commit=False)  # type: ignore


# Dependency
async def get_session() -> AsyncSession:  # type: ignore
    async with AsyncSessionLocal() as session:  # type: ignore
        yield session  # type: ignore

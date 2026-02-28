from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.models.site import Site


async def get_site(db: AsyncSession, slug: str) -> Site | None:
    result = await db.execute(select(Site).where(Site.slug == slug))
    return result.scalar_one_or_none()


async def get_sites(db: AsyncSession, skip: int = 0, limit: int = 100) -> list[Site]:
    result = await db.execute(select(Site).offset(skip).limit(limit))
    return list(result.scalars().all())


async def get_sites_by_slugs(db: AsyncSession, slugs: list[str], chunk_size: int = 5000) -> list[Site]:
    sites: list[Site] = []
    for i in range(0, len(slugs), chunk_size):
        chunk = slugs[i : i + chunk_size]
        result = await db.execute(select(Site).where(Site.slug.in_(chunk)))
        sites.extend(result.scalars().all())
    return sites


async def create_site(db: AsyncSession, slug: str, domain: str | None = None, title: str | None = None) -> Site:
    site = Site(slug=slug, domain=domain, title=title)
    db.add(site)
    await db.commit()
    await db.refresh(site)
    return site


async def update_site(db: AsyncSession, site_id: int, **kwargs) -> Site | None:
    result = await db.execute(select(Site).where(Site.id == site_id))
    site = result.scalar_one_or_none()
    if not site:
        return None
    for key, value in kwargs.items():
        setattr(site, key, value)
    await db.commit()
    await db.refresh(site)
    return site


async def delete_site(db: AsyncSession, site_id: int) -> bool:
    result = await db.execute(select(Site).where(Site.id == site_id))
    site = result.scalar_one_or_none()
    if not site:
        return False
    await db.delete(site)
    await db.commit()
    return True

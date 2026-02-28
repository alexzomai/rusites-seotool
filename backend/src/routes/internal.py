import asyncio
import io

import pandas as pd
from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from sqlalchemy.ext.asyncio import AsyncSession

from src.crud.metric import upsert_metric
from src.crud.site import create_site, get_sites_by_slugs
from src.database import get_session

router = APIRouter(prefix="/internal", tags=["Internal"])

REQUIRED_COLUMNS = {"slug", "domain", "title", "visits"}


@router.post("/upload_csv")
async def upload_csv_from_parser(file: UploadFile = File(...), db: AsyncSession = Depends(get_session)):
    raw = await file.read()

    loop = asyncio.get_event_loop()
    try:
        df = await loop.run_in_executor(None, pd.read_csv, io.BytesIO(raw))
    except Exception as e:
        raise HTTPException(status_code=422, detail=f"Failed to parse CSV: {e}")

    missing = REQUIRED_COLUMNS - set(df.columns)
    if missing:
        raise HTTPException(status_code=422, detail=f"Missing columns: {missing}")

    slugs = df["slug"].astype(str).tolist()
    existing_sites = await get_sites_by_slugs(db, slugs)
    sites_map: dict[str, object] = {site.slug: site for site in existing_sites}

    sites_created = 0
    metrics_created = 0
    metrics_updated = 0

    for row in df.itertuples(index=False):
        slug = str(row.slug)
        domain = str(row.domain) if pd.notna(row.domain) else None
        title = str(row.title) if pd.notna(row.title) else None
        visits = int(row.visits) if pd.notna(row.visits) else None

        site = sites_map.get(slug)
        if not site:
            site = await create_site(db, slug=slug, domain=domain, title=title)
            sites_map[slug] = site
            sites_created += 1

        if visits is not None:
            _, created = await upsert_metric(db, site_id=site.id, visits=visits)
            if created:
                metrics_created += 1
            else:
                metrics_updated += 1

    return {
        "sites_created": sites_created,
        "metrics_created": metrics_created,
        "metrics_updated": metrics_updated,
    }

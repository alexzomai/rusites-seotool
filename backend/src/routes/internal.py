import asyncio
import io
import logging

import pandas as pd
from fastapi import APIRouter, BackgroundTasks, File, HTTPException, UploadFile

from src.crud.metric import upsert_metric
from src.crud.site import create_site, get_sites_by_slugs
from src.database import AsyncSessionFactory

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/internal", tags=["Internal"])

REQUIRED_COLUMNS = {"slug", "domain", "title", "visits"}


async def _process_csv(raw: bytes):
    loop = asyncio.get_event_loop()
    try:
        df = await loop.run_in_executor(None, pd.read_csv, io.BytesIO(raw))
    except Exception as e:
        logger.error("Failed to parse CSV in background: %s", e)
        return

    logger.info("Начало обработки: %d строк", len(df))

    sites_created = 0
    metrics_created = 0
    metrics_updated = 0

    async with AsyncSessionFactory() as db:
        try:
            slugs = df["slug"].astype(str).tolist()
            existing_sites = await get_sites_by_slugs(db, slugs)
            sites_map: dict[str, object] = {site.slug: site for site in existing_sites}

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
        except Exception as e:
            await db.rollback()
            logger.error("Ошибка обработки CSV: %s", e)
            return

    logger.info(
        "Обработка завершена: новых сайтов=%d, новых метрик=%d, обновлено метрик=%d",
        sites_created, metrics_created, metrics_updated,
    )


@router.post("/upload_csv", status_code=202)
async def upload_csv_from_parser(background_tasks: BackgroundTasks, file: UploadFile = File(...)):
    raw = await file.read()

    loop = asyncio.get_event_loop()
    try:
        df = await loop.run_in_executor(None, pd.read_csv, io.BytesIO(raw))
    except Exception as e:
        raise HTTPException(status_code=422, detail=f"Failed to parse CSV: {e}")

    missing = REQUIRED_COLUMNS - set(df.columns)
    if missing:
        raise HTTPException(status_code=422, detail=f"Missing columns: {missing}")

    logger.info("Получен файл: %d строк (%.1f KB), запускаю фоновую обработку", len(df), len(raw) / 1024)
    background_tasks.add_task(_process_csv, raw)
    return {"status": "accepted", "rows": len(df)}

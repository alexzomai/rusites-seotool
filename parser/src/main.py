import asyncio
import csv
import gzip
import json
import os
from datetime import date
from io import BytesIO, StringIO

import aiohttp

from config import (
    BACKEND_URL,
    BACKUP_DIR,
    BASE_URL,
    CSV_FILE,
    JSON_FILE,
    PARAM_PAGE,
    PARAM_PER_PAGE,
    PER_PAGE,
)
from timer import timeit


async def async_fetch_pages(urls: list[str], concurrency: int = 8) -> list:
    semaphore = asyncio.Semaphore(concurrency)

    async def fetch(session: aiohttp.ClientSession, url: str) -> str:
        async with semaphore:
            async with session.get(url) as r:
                r.raise_for_status()
                data = await r.read()
                return data.decode("utf-8", errors="replace")

    async with aiohttp.ClientSession() as session:
        return await asyncio.gather(*[fetch(session, url) for url in urls])


def parse_tsv(tsv_data: str) -> list[dict]:
    reader = csv.reader(StringIO(tsv_data), delimiter="\t")
    rows = []
    for row in reader:
        if not row or row[0].startswith("всего"):
            continue
        rows.append(
            {
                "id": row[0],
                "domain": row[1],
                "title": row[2].replace("&quot;", "'") if len(row) > 2 else None,
                "visits": int(row[3]) if len(row) > 3 and row[3].isdigit() else 0,
            }
        )
    return rows


def save_to_json(records: list[dict], filename: str):
    if not records:
        return
    with open(filename, mode="w", encoding="utf-8") as file:
        json.dump(records, file, ensure_ascii=False, default=str)


def save_to_csv(records: list[dict], filename: str):
    if not records:
        return
    with open(filename, mode="w", encoding="utf-8", newline="") as file:
        writer = csv.DictWriter(file, fieldnames=records[0].keys())
        writer.writeheader()
        writer.writerows(records)


def save_to_csv_gz(records: list[dict], filename: str, keep: int = 30):
    if not records:
        return
    os.makedirs(BACKUP_DIR, exist_ok=True)
    path = os.path.join(BACKUP_DIR, filename)
    buf = StringIO()
    writer = csv.DictWriter(buf, fieldnames=records[0].keys())
    writer.writeheader()
    writer.writerows(records)
    with gzip.open(path, "wb") as f:
        f.write(buf.getvalue().encode("utf-8"))

    files = sorted(
        (f for f in os.scandir(BACKUP_DIR) if f.name.endswith(".gz")),
        key=lambda f: f.stat().st_mtime,
    )
    for old in files[:-keep]:
        os.remove(old.path)


async def send_data(records: list[dict]):
    if not records:
        return
    buf = StringIO()
    writer = csv.DictWriter(buf, fieldnames=records[0].keys())
    writer.writeheader()
    writer.writerows(records)
    csv_bytes = buf.getvalue().encode("utf-8")

    async with aiohttp.ClientSession() as session:
        data = aiohttp.FormData()
        data.add_field("file", BytesIO(csv_bytes), filename="data.csv", content_type="text/csv")

        async with session.post(f"http://{BACKEND_URL}/internal/upload_csv", data=data) as resp:
            return await resp.json()


@timeit
async def main():
    print(f"Дата парсинга: {date.today()}")

    # первый запрос: узнаем общее кол-во записей
    def page_url(p: int) -> str:  # пример: https://www.liveinternet.ru/rating/ru/today.tsv?per_page=1000&page=1
        return f"{BASE_URL}?{PARAM_PER_PAGE}={PER_PAGE}&{PARAM_PAGE}={p}"

    first_tsv = (await async_fetch_pages([page_url(1)]))[0]
    first_line = first_tsv.splitlines()[0]
    total = int(first_line.split("\t")[1])
    total_pages = (total + PER_PAGE - 1) // PER_PAGE
    print(f"Всего записей: {total}, страниц: {total_pages}")

    # остальные страницы параллельно
    remaining_urls = [page_url(p) for p in range(2, total_pages + 1)]
    remaining = await async_fetch_pages(remaining_urls)

    all_rows = []
    for tsv in [first_tsv] + list(remaining):
        all_rows.extend(parse_tsv(tsv))

    loop = asyncio.get_event_loop()
    result, _ = await asyncio.gather(
        send_data(all_rows),
        loop.run_in_executor(None, save_to_csv_gz, all_rows, CSV_FILE + ".gz"),
    )
    print(f"Ответ сервера: {result}")

    unique = len({row["id"] for row in all_rows})
    print(f"Отправлено {len(all_rows)} строк, уникальных сайтов: {unique}")


if __name__ == "__main__":
    asyncio.run(main())

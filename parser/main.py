import asyncio
import csv
import json
from datetime import date
from io import StringIO

import aiohttp

from timer import timeit

BASE_URL = "https://www.liveinternet.ru/rating/ru/today.tsv"
JSON_FILE = f"presswatch_data_{date.today()}.json"


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
                "d": row[1],
                "t": row[2].replace("&quot;", "'") if len(row) > 2 else None,
                "v": int(row[3]) if len(row) > 3 and row[3].isdigit() else 0,
            }
        )
    return rows


def save_to_json(records: list[dict], filename: str):
    if not records:
        return
    with open(filename, mode="w", encoding="utf-8") as file:
        json.dump(records, file, ensure_ascii=False, default=str)


@timeit
async def main():
    print(f"Дата парсинга: {date.today()}")
    per_page = 1000

    # Первый запрос: узнаём общее кол-во записей
    first_tsv = (await async_fetch_pages([f"{BASE_URL}?per_page={per_page}&page=1"]))[0]
    first_line = first_tsv.splitlines()[0]
    total = int(first_line.split("\t")[1])
    total_pages = (total + per_page - 1) // per_page
    print(f"Всего записей: {total}, страниц: {total_pages}")

    # Остальные страницы параллельно
    remaining_urls = [f"{BASE_URL}?per_page={per_page}&page={p}" for p in range(2, total_pages + 1)]
    remaining = await async_fetch_pages(remaining_urls)

    all_rows = []
    for tsv in [first_tsv] + list(remaining):
        all_rows.extend(parse_tsv(tsv))

    save_to_json(all_rows, JSON_FILE)

    unique = len({row["id"] for row in all_rows})
    print(f"Сохранено {len(all_rows)} строк, уникальных сайтов: {unique}")


if __name__ == "__main__":
    asyncio.run(main())

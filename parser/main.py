import asyncio
import csv
from datetime import date
from io import StringIO

import aiohttp
import requests

from timer import timeit

BASE_URL = "https://www.liveinternet.ru/rating/ru/today.tsv"
CSV_FILE = f"presswatch_data_{date.today()}.csv"


def fetch_page(page: int, per_page: int = 1000) -> str:
    url = f"{BASE_URL}?per_page={per_page}&page={page}"
    r = requests.get(url, timeout=10)
    r.raise_for_status()
    return r.text


async def async_fetch_pages(urls: list[str]) -> list:
    async def fetch(session: aiohttp.ClientSession, url: str) -> str:
        async with session.get(url) as r:
            r.raise_for_status()
            return await r.text()

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
                "system_id": row[0],
                "domain": row[1],
                "title": row[2] if len(row) > 2 else None,
                "visits": int(row[3]) if len(row) > 3 and row[3].isdigit() else 0,
                "rating": int(row[4]) if len(row) > 4 and row[4].isdigit() else 0,
            }
        )
    return rows


def save_to_csv(records: list[dict], filename: str):
    if not records:
        return
    fieldnames = ["system_id", "domain", "title", "visits", "rating", "parse_date"]
    with open(filename, mode="w", newline="", encoding="utf-8") as file:
        writer = csv.DictWriter(file, fieldnames=fieldnames)
        writer.writeheader()
        for record in records:
            writer.writerow(record)


@timeit
async def main():
    all_rows = []
    prev_first = None
    per_page = 1000

    urls = [f"{BASE_URL}?per_page={per_page}&page={page}" for page in range(1, 50)]
    pages = await async_fetch_pages(urls)
    print(urls)

    print(*pages)
    for page in pages:
        print(len(page))

    # for page in range(1, 10):
    #     tsv_data = fetch_page(page)
    #     rows = parse_tsv(tsv_data)
    #     if not rows or rows[0] == prev_first:
    #         break
    #     prev_first = rows[0]
    #     all_rows.extend(rows)

    # # Add parse_date to each record
    # today = date.today()
    # for row in all_rows:
    #     row["parse_date"] = today

    # save_to_csv(all_rows, CSV_FILE)

    # print(f"Сохранено {len(all_rows)} записей за {today}")


if __name__ == "__main__":
    asyncio.run(main())

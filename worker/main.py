import asyncio
import requests
import csv
from io import StringIO
from datetime import date
from db import async_session, init_db, save_to_db

BASE_URL = "https://www.liveinternet.ru/rating/ru/media/today.tsv"


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
                "media_id": row[0],
                "domain": row[1],
                "title": row[2] if len(row) > 2 else None,
                "visits": int(row[3]) if len(row) > 3 and row[3].isdigit() else None,
                "rating": int(row[4]) if len(row) > 4 and row[4].isdigit() else None,
                "type": row[5] if len(row) > 5 else None,
                "flag": row[6] if len(row) > 6 else None,
            }
        )
    return rows


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
        await save_to_db(session, all_rows)

    print(f"Сохранено {len(all_rows)} записей за {date.today()}")


if __name__ == "__main__":
    asyncio.run(main())

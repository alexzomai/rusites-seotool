import asyncio
import csv
import gzip
import os
import re
from urllib.parse import urljoin

import aiohttp

from config import BACKUP_DIR, BACKEND_URL
from timer import timeit

ICONS_DIR = os.getenv("ICONS_DIR", "icons")
CONCURRENCY = int(os.getenv("ICONS_CONCURRENCY", "16"))
TIMEOUT = int(os.getenv("ICONS_TIMEOUT", "10"))

ICON_LINK_RE = re.compile(
    r"""<link[^>]+rel=["'](?:icon|shortcut icon|apple-touch-icon)["'][^>]*>""",
    re.IGNORECASE,
)
HREF_RE = re.compile(r"""href=["']([^"']+)["']""", re.IGNORECASE)


def read_domains_from_csv(path: str) -> list[dict]:
    opener = gzip.open if path.endswith(".gz") else open
    with opener(path, "rt", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        seen = set()
        rows = []
        for row in reader:
            domain = row["domain"].strip().rstrip("/")
            if domain and domain not in seen:
                seen.add(domain)
                rows.append({"slug": row["slug"], "domain": domain})
        return rows


def find_latest_csv() -> str:
    files = sorted(
        (f for f in os.scandir(BACKUP_DIR) if f.name.endswith(".csv.gz") or f.name.endswith(".csv")),
        key=lambda f: f.stat().st_mtime,
        reverse=True,
    )
    if not files:
        raise FileNotFoundError(f"CSV не найден в {BACKUP_DIR}")
    return files[0].path


def parse_icon_url(html: str, base_url: str) -> str | None:
    for match in ICON_LINK_RE.finditer(html):
        tag = match.group(0)
        href_match = HREF_RE.search(tag)
        if href_match:
            href = href_match.group(1)
            return urljoin(base_url, href)
    return None


def _ext_from_url(url: str, content_type: str | None) -> str:
    ct = (content_type or "").lower()
    if "svg" in ct or url.endswith(".svg"):
        return ".svg"
    if "png" in ct or url.endswith(".png"):
        return ".png"
    if "gif" in ct or url.endswith(".gif"):
        return ".gif"
    if "webp" in ct or url.endswith(".webp"):
        return ".webp"
    return ".ico"


async def fetch_icon(
    session: aiohttp.ClientSession, semaphore: asyncio.Semaphore, domain: str
) -> tuple[str, bytes | None, str | None]:
    base_url = f"https://{domain}"
    timeout = aiohttp.ClientTimeout(total=TIMEOUT)

    async with semaphore:
        # 1) попробовать найти <link rel="icon"> в HTML
        try:
            async with session.get(base_url, timeout=timeout, allow_redirects=True) as resp:
                if resp.status == 200:
                    html = await resp.text(errors="replace")
                    icon_url = parse_icon_url(html, str(resp.url))
                    if icon_url:
                        async with session.get(icon_url, timeout=timeout) as icon_resp:
                            if icon_resp.status == 200:
                                data = await icon_resp.read()
                                if len(data) > 0:
                                    ext = _ext_from_url(icon_url, icon_resp.content_type)
                                    return domain, data, ext
        except Exception:
            pass

        # 2) фолбэк: /favicon.ico
        try:
            favicon_url = f"{base_url}/favicon.ico"
            async with session.get(favicon_url, timeout=timeout, allow_redirects=True) as resp:
                if resp.status == 200:
                    data = await resp.read()
                    if len(data) > 0:
                        return domain, data, ".ico"
        except Exception:
            pass

    return domain, None, None


def save_icon(slug: str, data: bytes, ext: str):
    os.makedirs(ICONS_DIR, exist_ok=True)
    path = os.path.join(ICONS_DIR, f"{slug}{ext}")
    with open(path, "wb") as f:
        f.write(data)


@timeit
async def main():
    csv_path = find_latest_csv()
    print(f"CSV: {csv_path}")

    sites = read_domains_from_csv(csv_path)
    total = len(sites)
    print(f"Уникальных доменов: {total}")

    icons_abs = os.path.abspath(ICONS_DIR)
    os.makedirs(ICONS_DIR, exist_ok=True)
    print(f"Сохранение в: {icons_abs}\n")

    slug_map = {s["domain"]: s["slug"] for s in sites}
    semaphore = asyncio.Semaphore(CONCURRENCY)
    headers = {"User-Agent": "Mozilla/5.0 (compatible; PressWatch/1.0)"}
    saved = 0
    failed = 0
    done = 0

    async with aiohttp.ClientSession(headers=headers) as session:
        tasks = [fetch_icon(session, semaphore, s["domain"]) for s in sites]
        for coro in asyncio.as_completed(tasks):
            domain, data, ext = await coro
            done += 1
            if data:
                slug = slug_map[domain]
                save_icon(slug, data, ext)
                saved += 1
                print(f"  [{done}/{total}] ✓ {domain} → {slug}{ext} ({len(data)} bytes)")
            else:
                failed += 1
                print(f"  [{done}/{total}] ✗ {domain}")

    print(f"\nСохранено иконок: {saved}, не удалось: {failed}")


if __name__ == "__main__":
    asyncio.run(main())

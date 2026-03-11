import asyncio
import csv
import gzip
import io
import os
import re
from urllib.parse import urljoin

import aiohttp
import cairosvg
from PIL import Image

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


async def _try_fetch(
    session: aiohttp.ClientSession,
    semaphore: asyncio.Semaphore,
    url: str,
    timeout: aiohttp.ClientTimeout,
) -> tuple[bytes, str] | None:
    async with semaphore:
        try:
            async with session.get(url, timeout=timeout, allow_redirects=True) as resp:
                if resp.status == 200:
                    data = await resp.read()
                    if data:
                        return data, _ext_from_url(url, resp.content_type)
        except Exception:
            pass
    return None


async def _first_result(coros: list) -> tuple[bytes, str] | None:
    """Запускает все корутины параллельно, возвращает первый успешный результат."""
    pending = {asyncio.ensure_future(c) for c in coros}
    result = None
    try:
        while pending and result is None:
            done, pending = await asyncio.wait(pending, return_when=asyncio.FIRST_COMPLETED)
            for task in done:
                r = task.result()
                if r is not None:
                    result = r
                    for p in pending:
                        p.cancel()
                    pending.clear()
    finally:
        for p in pending:
            p.cancel()
    return result


async def fetch_icon(
    session: aiohttp.ClientSession, semaphore: asyncio.Semaphore, domain: str
) -> tuple[str, bytes | None, str | None]:
    alt_domain = domain[4:] if domain.startswith("www.") else f"www.{domain}"
    timeout = aiohttp.ClientTimeout(total=TIMEOUT)

    def fetch(url: str):
        return _try_fetch(session, semaphore, url, timeout)

    # Все кандидаты параллельно
    result = await _first_result([
        fetch(f"https://www.google.com/s2/favicons?domain={domain}&sz=32"),
        fetch(f"https://{domain}/favicon.ico"),
        fetch(f"https://www.google.com/s2/favicons?domain={alt_domain}&sz=32"),
        fetch(f"https://{alt_domain}/favicon.ico"),
    ])

    if result:
        return domain, *result
    return domain, None, None


def to_webp(data: bytes, ext: str) -> bytes | None:
    try:
        if ext == ".svg":
            data = cairosvg.svg2png(bytestring=data, output_width=64, output_height=64)
        img = Image.open(io.BytesIO(data)).convert("RGBA")
        img = img.resize((64, 64), Image.LANCZOS)
        buf = io.BytesIO()
        img.save(buf, format="WEBP", quality=85, method=4)
        return buf.getvalue()
    except Exception:
        return None


def save_icon(slug: str, data: bytes, ext: str):
    os.makedirs(ICONS_DIR, exist_ok=True)
    safe_slug = slug.replace("/", "_")

    webp = to_webp(data, ext)
    if webp:
        data, ext = webp, ".webp"

    path = os.path.join(ICONS_DIR, f"{safe_slug}{ext}")
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

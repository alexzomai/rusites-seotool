import os
from datetime import date

from dotenv import load_dotenv

load_dotenv()

BASE_URL = os.getenv("BASE_URL", "https://www.liveinternet.ru/rating/ru/today.tsv")
PARAM_PER_PAGE = os.getenv("PARAM_PER_PAGE", "per_page")
PARAM_PAGE = os.getenv("PARAM_PAGE", "page")
PER_PAGE = int(os.getenv("PER_PAGE", "1000"))
JSON_FILE = f"presswatch_data_{date.today()}.json"
CSV_FILE = f"presswatch_data_{date.today()}.csv"
BACKEND_URL = os.getenv("BACKEND_URL", "backend:8000")
BACKUP_DIR = os.getenv("BACKUP_DIR", "backups")

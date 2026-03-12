FROM python:3.12-slim

WORKDIR /app

RUN pip install uv

COPY pyproject.toml uv.lock* ./

RUN uv sync --frozen

COPY src ./src

ENV PYTHONPATH=/app/src
CMD ["uv", "run", "python", "src/main.py"]

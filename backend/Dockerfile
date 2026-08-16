# Build context is backend/ (see docker-compose.yml: build.context = ./backend).

FROM python:3.12-slim

COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /usr/local/bin/

RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app/backend

# Install dependencies first, separately from app code, so code-only changes
# don't invalidate this (slow — torch/sentence-transformers/etc.) layer.
COPY pyproject.toml uv.lock .python-version ./
RUN uv sync --frozen --no-install-project

COPY . .

# backend.app.* is imported as a package relative to the repo root, not from
# inside backend/ itself — matches how it's run locally (`uvicorn
# backend.app.main:app` from the repo root).
WORKDIR /app

ENV PATH="/app/backend/.venv/bin:$PATH" \
    PYTHONUNBUFFERED=1

EXPOSE 8000

CMD ["uvicorn", "backend.app.main:app", "--host", "0.0.0.0", "--port", "8000"]

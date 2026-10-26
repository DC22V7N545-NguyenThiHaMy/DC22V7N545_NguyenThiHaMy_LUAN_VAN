FROM python:3.13-slim

ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1 PIP_NO_CACHE_DIR=1
WORKDIR /app

# CPU-only PyTorch first: the default Linux wheel bundles CUDA and is several GB larger.
RUN pip install --index-url https://download.pytorch.org/whl/cpu "torch>=2.4"
COPY requirements.txt .
RUN pip install -r requirements.txt

COPY alembic.ini ./
COPY db_migrations ./db_migrations
COPY app ./app
COPY scripts ./scripts
RUN mkdir -p data/embeddings app/static/uploads \
    && useradd --create-home vela && chown -R vela:vela /app
USER vela

EXPOSE 8010
HEALTHCHECK --interval=30s --timeout=5s --start-period=60s \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://127.0.0.1:8010/', timeout=4)"

# init_db upgrades the schema, seed_data is idempotent (same sequence as start.ps1).
CMD ["sh", "-c", "python scripts/init_db.py && python scripts/seed_data.py && exec uvicorn app.main:app --host 0.0.0.0 --port 8010"]

FROM python:3.12-slim

# Prevent Python from writing .pyc files and enable unbuffered logging
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

WORKDIR /app

# ── Install dependencies ──────────────────────────────────
COPY service-user/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# ── Copy shared common modules (architecture §8) ─────────
COPY common /app/common

# ── Copy service source ──────────────────────────────────
COPY service-user/ .

EXPOSE 8001

CMD ["uvicorn", "src.main:app", "--host", "0.0.0.0", "--port", "8001"]

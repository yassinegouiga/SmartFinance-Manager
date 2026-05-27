FROM python:3.12-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Install python dependencies
COPY service-budget/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy shared common modules
COPY common /app/common

# Copy source code
COPY service-budget/ .

# Expose port
EXPOSE 8003

# Run the application
CMD ["uvicorn", "src.main:app", "--host", "0.0.0.0", "--port", "8003"]

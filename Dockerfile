FROM python:3.12-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# S3: non-root user
RUN adduser --disabled-password --no-create-home --gecos "" appuser

COPY backend/ backend/
COPY frontend/ frontend/

USER appuser

EXPOSE 8000

# S4: healthcheck (stdlib, no curl needed)
HEALTHCHECK --interval=30s --timeout=5s --retries=3 CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8000/health')"

CMD ["uvicorn", "backend.main:app", "--host", "0.0.0.0", "--port", "8000", "--ws-max-size", "16777216"]

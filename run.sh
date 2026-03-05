#!/usr/bin/env bash
set -e

echo "🚀 Avvio DeafChat..."
docker compose up -d --build
echo "✅ DeafChat avviato su http://localhost:8000"
docker compose logs -f

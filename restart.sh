#!/usr/bin/env bash
set -e

echo "🔄 Riavvio DeafChat..."
docker compose down
docker compose up -d --build
echo "✅ DeafChat riavviato su http://localhost:8000"
docker compose logs -f

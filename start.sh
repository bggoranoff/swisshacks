#!/usr/bin/env bash
set -euo pipefail

if [ ! -f .env ]; then
  echo "ERROR: .env file not found. Copy .env.example and fill in your API keys." >&2
  exit 1
fi

echo "Installing dependencies..."
(cd server && npm install)
(cd client && npm install)

echo "Building frontend..."
(cd client && npm run build)

echo "Starting server on http://localhost:${PORT:-3000}"
cd server && npx ts-node src/index.ts

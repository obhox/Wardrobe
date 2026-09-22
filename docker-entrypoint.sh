#!/bin/sh
set -e

# Apply database migrations, then start the server.
# The Prisma CLI is called via its real entry point so the adjacent *.wasm
# engine files resolve inside the standalone image.
PRISMA="node node_modules/prisma/build/index.js"

# Private networking (e.g. postgres.railway.internal) can take a few seconds
# at cold start, so retry — but never start the app on an unmigrated schema,
# and never use `db push --accept-data-loss` against production data.
attempt=1
until $PRISMA migrate deploy; do
  if [ "$attempt" -ge 20 ]; then
    echo "✗ migrations failed after $attempt attempts — not starting" >&2
    exit 1
  fi
  echo "… database not ready or migration failed (attempt $attempt), retrying in 3s" >&2
  attempt=$((attempt + 1))
  sleep 3
done
echo "✦ database migrated"

echo "✦ starting wardrobe on :${PORT:-3000}"
exec node server.js

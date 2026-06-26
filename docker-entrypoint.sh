#!/bin/sh
set -e

# Apply the schema to the database, then start the server.
# Call the Prisma CLI via its real entry point (not the .bin symlink) so the
# adjacent *.wasm engine files resolve correctly inside the standalone image.
PRISMA="node node_modules/prisma/build/index.js"

# Uses `migrate deploy` if migration files exist, otherwise `db push`.
sync_schema() {
  if [ -d "./prisma/migrations" ] && [ -n "$(ls -A ./prisma/migrations 2>/dev/null)" ]; then
    echo "✦ applying migrations…"
    $PRISMA migrate deploy
  else
    echo "✦ syncing schema (db push)…"
    $PRISMA db push --skip-generate --accept-data-loss
  fi
}

# Run the schema sync in the BACKGROUND with retries. Railway private networking
# (postgres.railway.internal) takes a few seconds to initialize at cold start,
# during which Prisma's connect can hang well past the healthcheck window. We must
# not block `server.js` on it — the health route has no DB dependency, so starting
# the server first lets the deploy go healthy while the schema converges behind it.
(
  attempt=1
  until sync_schema; do
    if [ "$attempt" -ge 15 ]; then
      echo "✗ schema sync failed after $attempt attempts — leaving server running" >&2
      exit 0
    fi
    echo "… db not ready (attempt $attempt), retrying in 3s" >&2
    attempt=$((attempt + 1))
    sleep 3
  done
  echo "✦ schema in sync"
) &

echo "✦ starting wardrobe on :${PORT:-3000}"
exec node server.js

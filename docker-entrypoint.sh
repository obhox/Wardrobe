#!/bin/sh
set -e

# Apply database migrations, then start the server.
# The Prisma CLI is called via its real entry point so the adjacent *.wasm
# engine files resolve inside the standalone image.
PRISMA="node node_modules/prisma/build/index.js"

# Private networking (e.g. postgres.railway.internal) can take a few seconds
# at cold start, so retry — but never start the app on an unmigrated schema,
# and never use `db push --accept-data-loss` against production data.
# A database created with the old `db push` has tables but no migration
# history, so `migrate deploy` refuses it with P3005. 0_init is exactly that
# schema: mark it applied once, then retry to apply the rest.
migrate() {
  out=$($PRISMA migrate deploy 2>&1) && { echo "$out"; return 0; }
  echo "$out" >&2
  if echo "$out" | grep -q "P3005"; then
    echo "✦ existing database has no migration history — baselining at 0_init"
    $PRISMA migrate resolve --applied 0_init && $PRISMA migrate deploy
    return
  fi
  return 1
}

attempt=1
until migrate; do
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

#!/bin/sh
set -e

# Apply the schema to the database before starting.
# Uses `migrate deploy` if migration files exist, otherwise `db push`.
# Call the Prisma CLI via its real entry point (not the .bin symlink) so the
# adjacent *.wasm engine files resolve correctly inside the standalone image.
PRISMA="node node_modules/prisma/build/index.js"
if [ -d "./prisma/migrations" ] && [ -n "$(ls -A ./prisma/migrations 2>/dev/null)" ]; then
  echo "✦ applying migrations…"
  $PRISMA migrate deploy
else
  echo "✦ syncing schema (db push)…"
  $PRISMA db push --skip-generate --accept-data-loss
fi

echo "✦ starting wardrobe on :${PORT:-3000}"
exec node server.js

# syntax=docker/dockerfile:1
# ---------------------------------------------------------------------------
# wardrobe — production image (Next.js standalone + Prisma + Postgres)
# Build:  docker build -t wardrobe .
# Run:    docker run -p 3000:3000 --env-file .env wardrobe
# ---------------------------------------------------------------------------

FROM node:20-slim AS base
ENV NEXT_TELEMETRY_DISABLED=1

# ---- deps: install full dependencies (incl. native argon2) ----
FROM base AS deps
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends \
      openssl ca-certificates python3 make g++ \
    && rm -rf /var/lib/apt/lists/*
COPY package.json package-lock.json* ./
COPY prisma ./prisma
# Use `npm install` rather than `npm ci`: the eslint-config-next -> @unrs/resolver
# transitive chain ships a nested @emnapi/* wasm tree that npm's lockfile format
# can't reconcile for `npm ci` (npm install/ci disagree). `npm install` is tolerant.
RUN npm install --no-audit --no-fund

# ---- builder: generate Prisma client + build Next ----
FROM base AS builder
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends openssl && rm -rf /var/lib/apt/lists/*
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# placeholder so the Prisma client + Next build don't require a live DB
ENV DATABASE_URL="postgres://build:build@localhost:5432/build"
RUN npx prisma generate && npm run build

# ---- runner: minimal standalone server ----
FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production \
    PORT=3000 \
    HOSTNAME=0.0.0.0
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates \
    && rm -rf /var/lib/apt/lists/* \
    && addgroup --system --gid 1001 nodejs \
    && adduser --system --uid 1001 nextjs

# Next standalone output
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

# Full node_modules so the Prisma CLI (db push / migrate deploy) has its complete
# dependency tree at runtime. The standalone output only traces deps imported by
# the app, which omits CLI-only deps like `effect`/`c12` that @prisma/config needs.
# This copy is a superset of the standalone server's traced node_modules.
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/prisma ./prisma

COPY docker-entrypoint.sh ./docker-entrypoint.sh
RUN chmod +x ./docker-entrypoint.sh && chown -R nextjs:nodejs /app

USER nextjs
EXPOSE 3000
ENTRYPOINT ["./docker-entrypoint.sh"]

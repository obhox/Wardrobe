# syntax=docker/dockerfile:1
# ---------------------------------------------------------------------------
# wardrobe — production image (Next.js standalone + Prisma + Postgres)
# Build:  docker build -t wardrobe .
# Run:    docker run -p 3000:3000 --env-file .env wardrobe
# ---------------------------------------------------------------------------

FROM node:22-slim AS base
ENV NEXT_TELEMETRY_DISABLED=1

# ---- deps: full dependency tree (native argon2 + sharp) ----
FROM base AS deps
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends \
      openssl ca-certificates python3 make g++ \
    && rm -rf /var/lib/apt/lists/*
COPY package.json package-lock.json ./
COPY prisma ./prisma
RUN npm ci --no-audit --no-fund || npm install --no-audit --no-fund

# ---- builder: generate Prisma client + build Next ----
FROM base AS builder
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends openssl && rm -rf /var/lib/apt/lists/*
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# placeholders so the build doesn't need a live DB or runtime secrets
ENV DATABASE_URL="postgres://build:build@localhost:5432/build"
# baked into the client bundle / CSP at build time (optional)
ARG S3_PUBLIC_URL=""
ARG NEXT_PUBLIC_IMGLY_PUBLIC_PATH=""
ENV S3_PUBLIC_URL=$S3_PUBLIC_URL NEXT_PUBLIC_IMGLY_PUBLIC_PATH=$NEXT_PUBLIC_IMGLY_PUBLIC_PATH
RUN npx prisma generate && npm run build
# a lean tree just for the Prisma CLI at runtime (migrate deploy)
RUN mkdir -p /prisma-cli && cd /prisma-cli \
    && npm init -y >/dev/null \
    && npm install --no-audit --no-fund --omit=dev prisma@$(node -p "require('/app/node_modules/prisma/package.json').version")

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

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
# Prisma CLI (+ its deps) for migrations; the app's own client is already traced
COPY --from=builder /prisma-cli/node_modules ./node_modules/.prisma-cli
RUN cp -rn ./node_modules/.prisma-cli/* ./node_modules/ && rm -rf ./node_modules/.prisma-cli
COPY --from=builder /app/prisma ./prisma
COPY docker-entrypoint.sh ./docker-entrypoint.sh
RUN chmod +x ./docker-entrypoint.sh

USER nextjs
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=60s CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||3000)+'/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
ENTRYPOINT ["./docker-entrypoint.sh"]

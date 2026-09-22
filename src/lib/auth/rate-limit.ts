import "server-only";
import { prisma } from "@/lib/db";

// Fixed-window rate limiter backed by Postgres (brief §24: rate-limit +
// exponential back-off). Shared by every instance and survives deploys.
//
//   hit(key, { limit, windowMs })  counts an attempt; blocked once over limit
//   fail(key)                      a failed secret check: adds back-off
//   clear(key)                     a success resets the key

export interface RateResult {
  allowed: boolean;
  retryAfterMs: number;
}

interface Opts {
  limit: number;
  windowMs: number;
}

export async function hit(key: string, { limit, windowMs }: Opts): Promise<RateResult> {
  const now = new Date();
  const windowStart = new Date(now.getTime() - windowMs);

  // atomic upsert: reset the window when it has elapsed, otherwise increment
  const rows = await prisma.$queryRaw<{ count: number; windowStart: Date; blockedUntil: Date | null }[]>`
    INSERT INTO "RateLimit" ("key", "count", "windowStart")
    VALUES (${key}, 1, ${now})
    ON CONFLICT ("key") DO UPDATE SET
      "count" = CASE WHEN "RateLimit"."windowStart" < ${windowStart} THEN 1 ELSE "RateLimit"."count" + 1 END,
      "windowStart" = CASE WHEN "RateLimit"."windowStart" < ${windowStart} THEN ${now} ELSE "RateLimit"."windowStart" END
    RETURNING "count", "windowStart", "blockedUntil"`;
  const row = rows[0];

  if (row.blockedUntil && row.blockedUntil > now) {
    return { allowed: false, retryAfterMs: row.blockedUntil.getTime() - now.getTime() };
  }
  if (row.count > limit) {
    return {
      allowed: false,
      retryAfterMs: Math.max(1000, row.windowStart.getTime() + windowMs - now.getTime()),
    };
  }
  maybeSweep();
  return { allowed: true, retryAfterMs: 0 };
}

// Read-only check (does not count an attempt).
export async function peek(key: string): Promise<RateResult> {
  const row = await prisma.rateLimit.findUnique({ where: { key } });
  const now = Date.now();
  if (row?.blockedUntil && row.blockedUntil.getTime() > now) {
    return { allowed: false, retryAfterMs: row.blockedUntil.getTime() - now };
  }
  return { allowed: true, retryAfterMs: 0 };
}

// Record a failed secret check: after 3 failures, back off 2^(n-3)s (max 15 min).
export async function fail(key: string): Promise<void> {
  const k = `fail:${key}`;
  const row = await prisma.rateLimit.upsert({
    where: { key: k },
    create: { key: k, count: 1 },
    update: { count: { increment: 1 } },
  });
  if (row.count >= 3) {
    const delay = Math.min(2 ** (row.count - 3) * 1000, 15 * 60 * 1000);
    await prisma.rateLimit.update({
      where: { key: k },
      data: { blockedUntil: new Date(Date.now() + delay) },
    });
  }
}

export async function failed(key: string): Promise<RateResult> {
  return peek(`fail:${key}`);
}

export async function clear(key: string): Promise<void> {
  await prisma.rateLimit.deleteMany({ where: { key: `fail:${key}` } });
}

// Opportunistic cleanup of stale rows (and other short-lived auth tables)
// roughly once every few hundred requests — no cron needed.
function maybeSweep() {
  if (Math.random() > 0.005) return;
  const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const now = new Date();
  Promise.all([
    prisma.rateLimit.deleteMany({
      where: { windowStart: { lt: dayAgo }, OR: [{ blockedUntil: null }, { blockedUntil: { lt: now } }] },
    }),
    prisma.webAuthnChallenge.deleteMany({ where: { expiresAt: { lt: now } } }),
    prisma.emailCode.deleteMany({ where: { expiresAt: { lt: dayAgo } } }),
    prisma.session.deleteMany({ where: { expiresAt: { lt: now } } }),
  ]).catch(() => {});
}

// common policies
export const LIMITS = {
  // secret checks per IP (login, register, verify)
  authIp: { limit: 20, windowMs: 10 * 60 * 1000 },
  // emails we send to one address / from one IP
  mailPerEmail: { limit: 4, windowMs: 60 * 60 * 1000 },
  mailPerIp: { limit: 10, windowMs: 60 * 60 * 1000 },
  // outbound fetches (scrape, price check, image ingest)
  fetchPerUser: { limit: 60, windowMs: 10 * 60 * 1000 },
  uploadPerUser: { limit: 120, windowMs: 60 * 60 * 1000 },
} as const;

import "server-only";

// Simple in-memory rate limiter with exponential back-off (brief §24).
// Note: per-instance only. For multi-instance on Railway, back this with
// Redis/Upstash — the interface here stays the same.

interface Bucket {
  fails: number;
  blockedUntil: number;
}

const buckets = new Map<string, Bucket>();

export interface RateResult {
  allowed: boolean;
  retryAfterMs: number;
}

export function checkRate(key: string): RateResult {
  const now = Date.now();
  const b = buckets.get(key);
  if (b && b.blockedUntil > now) {
    return { allowed: false, retryAfterMs: b.blockedUntil - now };
  }
  return { allowed: true, retryAfterMs: 0 };
}

export function recordFailure(key: string): void {
  const b = buckets.get(key) ?? { fails: 0, blockedUntil: 0 };
  b.fails += 1;
  // back-off after 3 fails: 2^(n-3) seconds, capped at 5 min
  if (b.fails >= 3) {
    const delay = Math.min(2 ** (b.fails - 3) * 1000, 5 * 60 * 1000);
    b.blockedUntil = Date.now() + delay;
  }
  buckets.set(key, b);
}

export function recordSuccess(key: string): void {
  buckets.delete(key);
}

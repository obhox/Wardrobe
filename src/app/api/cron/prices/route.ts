import { NextRequest } from "next/server";
import crypto from "node:crypto";
import { env } from "@/lib/env";
import { runPriceChecks } from "@/lib/server/price-check";
import { error, json } from "@/lib/server/http";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// POST (Authorization: Bearer $CRON_SECRET) → check the stalest tracked prices.
// Run it from a scheduler every few hours, e.g.
//   curl -fsS -X POST -H "authorization: Bearer $CRON_SECRET" https://<app>/api/cron/prices
export async function POST(req: NextRequest) {
  const secret = env.cronSecret;
  if (!secret) return error("price checks aren't configured (set CRON_SECRET)", 503);
  const given = Buffer.from(req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "");
  const want = Buffer.from(secret);
  if (given.length !== want.length || !crypto.timingSafeEqual(given, want)) {
    return error("unauthorized", 401);
  }
  return json(await runPriceChecks());
}

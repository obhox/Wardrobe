import { NextRequest } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth/session";
import { hit, LIMITS } from "@/lib/auth/rate-limit";
import { extractUrl } from "@/lib/links";
import { assertPublicUrl } from "@/lib/server/safe-fetch";
import { scrapeProduct } from "@/lib/server/scrape";
import { json, readJson, tooMany, unauthorized } from "@/lib/server/http";

export const dynamic = "force-dynamic";

// accept pasted share text too ("Check this out! https://…") — see extractUrl
const schema = z.object({ url: z.string().min(1).max(4000) });

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return unauthorized();

  const parsed = schema.safeParse(await readJson(req));
  const url = parsed.success ? extractUrl(parsed.data.url) : null;
  if (!url) return json({ ok: false, error: "invalid url" }, 400);
  try {
    assertPublicUrl(url);
  } catch {
    return json({ ok: false, error: "that link can't be read" }, 400);
  }

  const rate = await hit(`fetch:${user.id}`, LIMITS.fetchPerUser);
  if (!rate.allowed) return tooMany(rate.retryAfterMs);

  return json(await scrapeProduct(url));
}

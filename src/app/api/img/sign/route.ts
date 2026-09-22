import { NextRequest } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth/session";
import { sign } from "@/lib/auth/crypto";
import { error, json, readJson, unauthorized } from "@/lib/server/http";

export const dynamic = "force-dynamic";

// POST { urls } → signed /api/img links (used by the browser extension, whose
// <img> requests don't carry the session cookie).
const schema = z.object({ urls: z.array(z.string().url().max(4000)).max(60) });

export async function POST(req: NextRequest) {
  if (!(await getCurrentUser())) return unauthorized();
  const parsed = schema.safeParse(await readJson(req));
  if (!parsed.success) return error("invalid input", 400);
  return json({
    urls: Object.fromEntries(
      parsed.data.urls.map((u) => [u, `/api/img?url=${encodeURIComponent(u)}&sig=${sign(u)}`])
    ),
  });
}

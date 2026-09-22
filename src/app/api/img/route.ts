import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { verifySignature } from "@/lib/auth/crypto";
import { RASTER_TYPES, safeFetch, sniffImage } from "@/lib/server/safe-fetch";
import { Lru } from "@/lib/server/lru";

export const dynamic = "force-dynamic";

// Same-origin image proxy for third-party item photos (keeps screenshots
// untainted and sidesteps hotlink blocks). Hardened:
//   - only signed-in users, or a URL signed by the server (guest views)
//   - SSRF-safe fetch (private addresses, redirects re-checked)
//   - raster images only, sniffed from bytes; never SVG/HTML
//   - served with a sandbox CSP + nosniff

const MAX_BYTES = 8 * 1024 * 1024;
const cache = new Lru<{ type: string; body: Buffer }>(200, 10 * 60 * 1000);

const SAFE_HEADERS = {
  "x-content-type-options": "nosniff",
  "content-security-policy": "default-src 'none'; sandbox",
  "content-disposition": "inline",
  "cross-origin-resource-policy": "cross-origin",
};

export async function GET(req: NextRequest) {
  const raw = req.nextUrl.searchParams.get("url");
  if (!raw) return NextResponse.json({ error: "missing url" }, { status: 400 });

  const signed = verifySignature(raw, req.nextUrl.searchParams.get("sig"));
  if (!signed && !(await getCurrentUser())) {
    return NextResponse.json({ error: "not signed in" }, { status: 401 });
  }

  let hit = cache.get(raw);
  if (!hit) {
    try {
      const res = await safeFetch(raw, { accept: "image/avif,image/webp,image/*;q=0.8", maxBytes: MAX_BYTES });
      if (!res.ok) return NextResponse.json({ error: "upstream error" }, { status: 502 });
      const type = sniffImage(res.body);
      if (!type || !RASTER_TYPES.has(type)) {
        return NextResponse.json({ error: "not an image" }, { status: 415 });
      }
      hit = { type, body: res.body };
      cache.set(raw, hit);
    } catch {
      return NextResponse.json({ error: "fetch failed" }, { status: 502 });
    }
  }

  return new NextResponse(new Uint8Array(hit.body), {
    status: 200,
    headers: {
      ...SAFE_HEADERS,
      "content-type": hit.type,
      "cache-control": signed ? "public, max-age=86400, immutable" : "private, max-age=86400",
      "access-control-allow-origin": "*",
    },
  });
}

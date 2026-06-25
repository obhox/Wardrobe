import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// Simple same-origin image proxy. Used so item cutouts (often hotlinked from
// external shops) render from our origin — that keeps client-side screenshots
// un-tainted and sidesteps third-party CORS. Read-only, images only.

const MAX_BYTES = 8 * 1024 * 1024; // 8MB guard

function isBlockedHost(host: string): boolean {
  const h = host.toLowerCase();
  if (h === "localhost" || h.endsWith(".localhost") || h === "0.0.0.0") return true;
  // crude private-range / loopback guard against SSRF
  if (/^127\./.test(h) || /^10\./.test(h) || /^192\.168\./.test(h)) return true;
  if (/^169\.254\./.test(h)) return true; // link-local (cloud metadata)
  if (/^172\.(1[6-9]|2\d|3[01])\./.test(h)) return true;
  if (h === "::1" || h.startsWith("fc") || h.startsWith("fd")) return true;
  return false;
}

export async function GET(req: NextRequest) {
  const raw = req.nextUrl.searchParams.get("url");
  if (!raw) return NextResponse.json({ error: "missing url" }, { status: 400 });

  let target: URL;
  try {
    target = new URL(raw);
  } catch {
    return NextResponse.json({ error: "invalid url" }, { status: 400 });
  }

  if (target.protocol !== "http:" && target.protocol !== "https:")
    return NextResponse.json({ error: "unsupported protocol" }, { status: 400 });
  if (isBlockedHost(target.hostname))
    return NextResponse.json({ error: "blocked host" }, { status: 400 });

  try {
    const upstream = await fetch(target.toString(), {
      headers: {
        // some CDNs 403 without a UA / accept header
        "user-agent": "Mozilla/5.0 (compatible; wardrobe/0.2; +https://wardrobe.app)",
        accept: "image/*,*/*;q=0.8",
      },
      // don't forward cookies/credentials
      redirect: "follow",
    });

    if (!upstream.ok)
      return NextResponse.json({ error: "upstream error" }, { status: 502 });

    const type = upstream.headers.get("content-type") ?? "";
    if (!type.startsWith("image/"))
      return NextResponse.json({ error: "not an image" }, { status: 415 });

    const len = Number(upstream.headers.get("content-length") ?? 0);
    if (len && len > MAX_BYTES)
      return NextResponse.json({ error: "too large" }, { status: 413 });

    const buf = await upstream.arrayBuffer();
    if (buf.byteLength > MAX_BYTES)
      return NextResponse.json({ error: "too large" }, { status: 413 });

    return new NextResponse(buf, {
      status: 200,
      headers: {
        "content-type": type,
        "cache-control": "public, max-age=86400, s-maxage=86400, immutable",
        "access-control-allow-origin": "*",
      },
    });
  } catch {
    return NextResponse.json({ error: "fetch failed" }, { status: 502 });
  }
}

import { NextRequest, NextResponse } from "next/server";

// Cross-site request guard for the API (Next 16 "proxy", formerly middleware).
// Writes must come from our own origin or from the browser extension; a form
// on another site can't POST here (login CSRF, forced actions). Session
// cookies are SameSite=Lax, this closes the remaining gaps (text/plain posts).

const WRITE = new Set(["POST", "PUT", "PATCH", "DELETE"]);

function allowedOrigin(origin: string, self: string): boolean {
  if (origin === self) return true;
  const configured = (process.env.APP_ORIGIN ?? "").replace(/\/+$/, "");
  if (configured && origin === configured) return true;
  // the wardrobe extension (web pages can't forge this origin)
  if (/^(chrome|moz|safari-web)-extension:\/\/[a-z0-9-]+$/i.test(origin)) return true;
  return false;
}

export function proxy(req: NextRequest) {
  if (!WRITE.has(req.method)) return NextResponse.next();
  // server-to-server callers (cron) authenticate with a bearer secret
  if (req.nextUrl.pathname.startsWith("/api/cron/")) return NextResponse.next();

  const origin = req.headers.get("origin");
  const site = req.headers.get("sec-fetch-site");
  if (origin) {
    if (!allowedOrigin(origin, req.nextUrl.origin)) {
      return NextResponse.json({ error: "cross-site request blocked" }, { status: 403 });
    }
  } else if (site && site !== "same-origin" && site !== "none") {
    return NextResponse.json({ error: "cross-site request blocked" }, { status: 403 });
  }
  return NextResponse.next();
}

export const config = {
  matcher: "/api/:path*",
};

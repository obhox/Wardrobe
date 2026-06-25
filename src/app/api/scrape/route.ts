import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import ogs from "open-graph-scraper";
import { getCurrentUser } from "@/lib/auth/session";
import type { ScrapeResult } from "@/lib/types";

export const dynamic = "force-dynamic";

const schema = z.object({ url: z.string().url() });

// tiny in-memory cache by URL (brief §22)
const cache = new Map<string, { at: number; data: ScrapeResult }>();
const TTL = 1000 * 60 * 30;

const UA = "Mozilla/5.0 (compatible; wardrobe/0.2; +https://wardrobe.app)";

// Walk a parsed JSON-LD value looking for a product offer price.
function priceFromJsonLd(node: unknown): { price?: number; currency?: string } {
  if (!node || typeof node !== "object") return {};
  if (Array.isArray(node)) {
    for (const n of node) {
      const hit = priceFromJsonLd(n);
      if (hit.price !== undefined) return hit;
    }
    return {};
  }
  const obj = node as Record<string, unknown>;
  // recurse through @graph / offers wrappers
  for (const key of ["@graph", "offers", "hasVariant", "itemListElement"]) {
    if (obj[key]) {
      const hit = priceFromJsonLd(obj[key]);
      if (hit.price !== undefined) return hit;
    }
  }
  const raw =
    (obj.price as string | number | undefined) ??
    (obj.lowPrice as string | number | undefined);
  if (raw !== undefined && raw !== null && raw !== "") {
    const price = Number(String(raw).replace(/[^0-9.]/g, ""));
    if (Number.isFinite(price))
      return { price, currency: (obj.priceCurrency as string) || undefined };
  }
  return {};
}

// Best-effort price extraction from raw HTML: JSON-LD first, then the common
// meta / microdata tags shops emit. Returns undefined price if nothing matches.
function extractPrice(html: string): { price?: number; currency?: string } {
  // 1) JSON-LD blocks
  const ldRe = /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let m: RegExpExecArray | null;
  while ((m = ldRe.exec(html))) {
    try {
      const hit = priceFromJsonLd(JSON.parse(m[1].trim()));
      if (hit.price !== undefined) return hit;
    } catch {
      /* malformed block — skip */
    }
  }

  // 2) meta / microdata tags
  const metaContent = (re: RegExp) => html.match(re)?.[1];
  const priceStr =
    metaContent(/<meta[^>]+(?:property|name)=["'](?:product:price:amount|og:price:amount|twitter:data1)["'][^>]+content=["']([^"']+)["']/i) ||
    metaContent(/<meta[^>]+itemprop=["']price["'][^>]+content=["']([^"']+)["']/i) ||
    metaContent(/itemprop=["']price["'][^>]*content=["']([^"']+)["']/i);
  const currency =
    metaContent(/<meta[^>]+(?:property|name)=["'](?:product:price:currency|og:price:currency)["'][^>]+content=["']([^"']+)["']/i) ||
    metaContent(/<meta[^>]+itemprop=["']priceCurrency["'][^>]+content=["']([^"']+)["']/i);

  if (priceStr) {
    const price = Number(priceStr.replace(/[^0-9.]/g, ""));
    if (Number.isFinite(price)) return { price, currency: currency || undefined };
  }
  return {};
}

async function fetchPrice(url: string): Promise<{ price?: number; currency?: string }> {
  try {
    const res = await fetch(url, { headers: { "user-agent": UA, accept: "text/html,*/*" } });
    if (!res.ok) return {};
    const html = (await res.text()).slice(0, 1_500_000); // cap parse work
    return extractPrice(html);
  } catch {
    return {};
  }
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success)
    return NextResponse.json({ ok: false, error: "invalid url" }, { status: 400 });

  const url = parsed.data.url;
  const hit = cache.get(url);
  if (hit && Date.now() - hit.at < TTL) {
    return NextResponse.json(hit.data);
  }

  try {
    const { result } = await ogs({
      url,
      fetchOptions: { headers: { "user-agent": UA } },
    });

    const image =
      result.ogImage?.[0]?.url ||
      result.twitterImage?.[0]?.url ||
      undefined;

    // og product fields are loosely typed — read them off a permissive view
    const loose = result as Record<string, unknown>;
    const priceRaw =
      (loose.productPriceAmount as string | undefined) ||
      (loose.ogPriceAmount as string | undefined) ||
      undefined;
    let price = priceRaw ? Number(priceRaw) : undefined;
    let currency =
      (loose.productPriceCurrency as string | undefined) ||
      (loose.ogPriceCurrency as string | undefined) ||
      undefined;

    // OG tags rarely carry price — fall back to JSON-LD / microdata in the HTML
    if (price === undefined || !Number.isFinite(price)) {
      const fromHtml = await fetchPrice(url);
      if (fromHtml.price !== undefined) {
        price = fromHtml.price;
        currency = currency || fromHtml.currency;
      }
    }

    const data: ScrapeResult = {
      ok: Boolean(image || result.ogTitle),
      imageUrl: image,
      title: result.ogTitle || result.twitterTitle || undefined,
      brand: result.ogSiteName || undefined,
      price: price !== undefined && Number.isFinite(price) ? price : undefined,
      currency: currency || "USD",
      sourceUrl: url,
    };

    cache.set(url, { at: Date.now(), data });
    return NextResponse.json(data);
  } catch {
    // graceful fallback (brief §19) — let the user fill details in manually
    const fallback: ScrapeResult = { ok: false, sourceUrl: url };
    return NextResponse.json(fallback);
  }
}

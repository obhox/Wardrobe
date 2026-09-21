import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import ogs from "open-graph-scraper";
import { getCurrentUser } from "@/lib/auth/session";
import type { ScrapeResult } from "@/lib/types";
import { extractPrice, parseAmount } from "@/lib/scrape-price";
import { absoluteUrl, extractUrl, isUnreadableShop, shopName, titleFromUrl } from "@/lib/links";

export const dynamic = "force-dynamic";

// accept pasted share text too ("Check this out! https://…") — see extractUrl
const schema = z.object({ url: z.string().min(1).max(4000) });

// tiny in-memory cache by URL (brief §22)
const cache = new Map<string, { at: number; data: ScrapeResult }>();
const TTL = 1000 * 60 * 30;

const UA = "Mozilla/5.0 (compatible; wardrobe/0.2; +https://wardrobe.app)";

async function fetchHtml(url: string): Promise<string> {
  try {
    const res = await fetch(url, {
      headers: { "user-agent": UA, accept: "text/html,*/*" },
      signal: AbortSignal.timeout(10_000),
    });
    return res.ok ? await res.text() : "";
  } catch {
    return "";
  }
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success)
    return NextResponse.json({ ok: false, error: "invalid url" }, { status: 400 });

  const url = extractUrl(parsed.data.url);
  if (!url) return NextResponse.json({ ok: false, error: "invalid url" }, { status: 400 });

  const hit = cache.get(url);
  if (hit && Date.now() - hit.at < TTL) {
    return NextResponse.json(hit.data);
  }

  // these shops only ever return a bot check / empty shell — don't bother
  // fetching, and don't pass on their placeholder logo as the item photo
  if (isUnreadableShop(url)) {
    const data: ScrapeResult = {
      ok: false,
      shop: shopName(url) ?? undefined,
      title: titleFromUrl(url),
      sourceUrl: url,
    };
    cache.set(url, { at: Date.now(), data });
    return NextResponse.json(data);
  }

  try {
    const { result, html: ogHtml } = await ogs({
      url,
      timeout: 10,
      fetchOptions: { headers: { "user-agent": UA } },
    });

    const image = absoluteUrl(
      result.ogImage?.[0]?.url || result.twitterImage?.[0]?.url || undefined,
      url,
    );
    const title = (result.ogTitle || result.twitterTitle || "").trim() || titleFromUrl(url);

    // og product fields are loosely typed — read them off a permissive view
    const loose = result as Record<string, unknown>;
    const og = {
      price: parseAmount(loose.productPriceAmount ?? loose.ogPriceAmount),
      currency: (loose.productPriceCurrency ?? loose.ogPriceCurrency) as string | undefined,
    };

    // OG tags rarely carry both price and currency — dig through the page for
    // JSON-LD, microdata, store config and the printed symbol
    const html = (ogHtml || (await fetchHtml(url))).slice(0, 1_500_000); // cap parse work
    const { price, currency } = extractPrice(html, url, og);

    const data: ScrapeResult = {
      ok: Boolean(image),
      imageUrl: image,
      title: title?.slice(0, 120),
      brand: result.ogSiteName?.slice(0, 80) || undefined,
      price,
      currency,
      sourceUrl: url,
    };

    cache.set(url, { at: Date.now(), data });
    return NextResponse.json(data);
  } catch {
    // graceful fallback (brief §19) — let the user fill details in manually
    const fallback: ScrapeResult = { ok: false, title: titleFromUrl(url), sourceUrl: url };
    return NextResponse.json(fallback);
  }
}

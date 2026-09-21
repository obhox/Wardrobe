import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import ogs from "open-graph-scraper";
import { getCurrentUser } from "@/lib/auth/session";
import type { ScrapeResult } from "@/lib/types";
import { extractPrice, parseAmount } from "@/lib/scrape-price";

export const dynamic = "force-dynamic";

const schema = z.object({ url: z.string().url() });

// tiny in-memory cache by URL (brief §22)
const cache = new Map<string, { at: number; data: ScrapeResult }>();
const TTL = 1000 * 60 * 30;

const UA = "Mozilla/5.0 (compatible; wardrobe/0.2; +https://wardrobe.app)";

async function fetchHtml(url: string): Promise<string> {
  try {
    const res = await fetch(url, { headers: { "user-agent": UA, accept: "text/html,*/*" } });
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

  const url = parsed.data.url;
  const hit = cache.get(url);
  if (hit && Date.now() - hit.at < TTL) {
    return NextResponse.json(hit.data);
  }

  try {
    const { result, html: ogHtml } = await ogs({
      url,
      fetchOptions: { headers: { "user-agent": UA } },
    });

    const image =
      result.ogImage?.[0]?.url ||
      result.twitterImage?.[0]?.url ||
      undefined;

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
      ok: Boolean(image || result.ogTitle),
      imageUrl: image,
      title: result.ogTitle || result.twitterTitle || undefined,
      brand: result.ogSiteName || undefined,
      price,
      currency,
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

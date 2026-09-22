import "server-only";
import ogs from "open-graph-scraper";
import type { ScrapeResult } from "@/lib/types";
import { extractPrice, parseAmount } from "@/lib/scrape-price";
import { absoluteUrl, isUnreadableShop, shopName, titleFromUrl } from "@/lib/links";
import { fetchHtml } from "./safe-fetch";
import { Lru } from "./lru";

// Link → product details. Pages are fetched through the SSRF-safe fetcher and
// only then handed to open-graph-scraper as a string (it never fetches).

const cache = new Lru<ScrapeResult>(500, 30 * 60 * 1000);

export async function scrapeProduct(url: string, { fresh = false } = {}): Promise<ScrapeResult> {
  if (!fresh) {
    const hit = cache.get(url);
    if (hit) return hit;
  }

  // these shops only ever return a bot check / empty shell
  if (isUnreadableShop(url)) {
    const data: ScrapeResult = { ok: false, shop: shopName(url) ?? undefined, title: titleFromUrl(url), sourceUrl: url };
    cache.set(url, data);
    return data;
  }

  const page = await fetchHtml(url);
  if (!page) return { ok: false, title: titleFromUrl(url), sourceUrl: url };

  try {
    const { result } = await ogs({ html: page.html });
    const image = absoluteUrl(
      result.ogImage?.[0]?.url || result.twitterImage?.[0]?.url || undefined,
      page.finalUrl
    );
    const title = (result.ogTitle || result.twitterTitle || "").trim() || titleFromUrl(url);
    const loose = result as Record<string, unknown>;
    const og = {
      price: parseAmount(loose.productPriceAmount ?? loose.ogPriceAmount),
      currency: (loose.productPriceCurrency ?? loose.ogPriceCurrency) as string | undefined,
    };
    const { price, currency } = extractPrice(page.html.slice(0, 1_500_000), page.finalUrl, og);

    const data: ScrapeResult = {
      ok: Boolean(image),
      imageUrl: image,
      title: title?.slice(0, 120),
      brand: result.ogSiteName?.slice(0, 80) || undefined,
      price,
      currency,
      sourceUrl: url,
    };
    cache.set(url, data);
    return data;
  } catch {
    return { ok: false, title: titleFromUrl(url), sourceUrl: url };
  }
}

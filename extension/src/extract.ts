// Injected into the shop tab by the popup. Reads the product from the page the
// user is actually looking at — so it works on shops (AliExpress, Temu, …)
// that only ever show the server-side scraper a bot check.
//
// Bundled to extension/extract.js by `npm run ext:build`; it shares the price
// parser with the /api/scrape route so both agree on price + currency.

import { extractPrice, parseAmount } from "../../src/lib/scrape-price";
import { absoluteUrl, titleFromUrl } from "../../src/lib/links";

export interface PageProduct {
  url: string;
  title?: string;
  brand?: string;
  price?: number;
  currency?: string;
  images: string[];
}

function meta(...names: string[]): string | undefined {
  for (const n of names) {
    const el = document.querySelector<HTMLMetaElement>(
      `meta[property="${n}"], meta[name="${n}"], meta[itemprop="${n}"]`,
    );
    const v = el?.content?.trim();
    if (v) return v;
  }
  return undefined;
}

// First schema.org Product in the page's JSON-LD, if any.
function ldProduct(): Record<string, unknown> | undefined {
  const find = (node: unknown): Record<string, unknown> | undefined => {
    if (!node || typeof node !== "object") return undefined;
    if (Array.isArray(node)) {
      for (const n of node) {
        const hit = find(n);
        if (hit) return hit;
      }
      return undefined;
    }
    const obj = node as Record<string, unknown>;
    const type = obj["@type"];
    if (type === "Product" || (Array.isArray(type) && type.includes("Product"))) return obj;
    return find(obj["@graph"]) ?? find(obj.mainEntity);
  };
  for (const s of document.querySelectorAll('script[type="application/ld+json"]')) {
    try {
      const hit = find(JSON.parse(s.textContent ?? ""));
      if (hit) return hit;
    } catch {
      /* malformed block — skip */
    }
  }
  return undefined;
}

function ldImages(p?: Record<string, unknown>): string[] {
  const img = p?.image;
  const list = Array.isArray(img) ? img : img ? [img] : [];
  return list
    .map((i) => (typeof i === "string" ? i : (i as { url?: string })?.url))
    .filter((s): s is string => typeof s === "string");
}

function ldBrand(p?: Record<string, unknown>): string | undefined {
  const b = p?.brand;
  if (typeof b === "string") return b;
  if (b && typeof b === "object") return (b as { name?: string }).name;
  return undefined;
}

// Big, visible <img>s — the product gallery, ranked by rendered area.
function pageImages(): string[] {
  const vw = window.innerWidth;
  return [...document.images]
    .filter((img) => {
      const r = img.getBoundingClientRect();
      return img.naturalWidth >= 200 && img.naturalHeight >= 200 && r.width >= 120 && r.height >= 120 && r.left < vw;
    })
    .map((img) => {
      const r = img.getBoundingClientRect();
      // favour what's near the top of the page (the hero shot) over recs below
      const weight = r.top + window.scrollY < 1400 ? 2 : 1;
      return { src: img.currentSrc || img.src, score: r.width * r.height * weight };
    })
    .sort((a, b) => b.score - a.score)
    .map((i) => i.src);
}

// Shop CDNs serve one photo at many sizes (?width=40, ?w=800…). Key images by
// URL minus the sizing params so the picker shows each photo once.
const SIZING = /^(width|height|w|h|size|quality|q|fit|crop|dpr|format|fm|auto|resize)$/i;
function photoKey(src: string): string {
  try {
    const u = new URL(src);
    for (const k of [...u.searchParams.keys()]) if (SIZING.test(k)) u.searchParams.delete(k);
    // Shopify-style filename sizes: shirt_800x800.jpg / shirt_1200x.jpg
    return (u.origin + u.pathname.replace(/_(\d+x\d*|\d*x\d+)(?=\.\w+$)/, "") + u.search).toLowerCase();
  } catch {
    return src;
  }
}

// "Linen Shirt – Blue - Uniqlo US" → "Linen Shirt – Blue". Page titles tack
// the shop's name on the end; cut from the first segment that names the shop.
export function cleanTitle(title: string | undefined, shopNames: (string | undefined)[]): string | undefined {
  if (!title) return undefined;
  const t = title.replace(/\s+/g, " ").trim();
  const names = shopNames.filter((n): n is string => !!n && n.length > 1).map((n) => n.toLowerCase());
  // split keeping the separators, so what survives reads exactly as written
  const bits = t.split(/(\s+[|–—·•]\s+|\s+-\s+)/);
  for (let i = 2; i < bits.length; i += 2) {
    if (names.some((n) => bits[i].toLowerCase().includes(n))) return bits.slice(0, i - 1).join("").slice(0, 120);
  }
  return t.slice(0, 120);
}

function extract(): PageProduct {
  const url = location.href;
  const ld = ldProduct();

  const images: string[] = [];
  const seen = new Set<string>();
  for (const src of [meta("og:image", "og:image:url", "twitter:image"), ...ldImages(ld), ...pageImages()]) {
    // some shops still print http:// in og:image on an https page
    const abs = absoluteUrl(src, url)?.replace(/^http:/, location.protocol === "https:" ? "https:" : "http:");
    if (!abs || /\.svg(\?|$)/i.test(abs)) continue; // logos and icons, not products
    const key = photoKey(abs);
    if (seen.has(key)) continue;
    seen.add(key);
    images.push(abs);
    if (images.length >= 12) break;
  }

  const title =
    (typeof ld?.name === "string" ? ld.name : undefined) ||
    meta("og:title", "twitter:title") ||
    document.querySelector("h1")?.textContent?.trim() ||
    document.title.trim() ||
    titleFromUrl(url);

  const site = meta("og:site_name");
  const brand = ldBrand(ld) || site || location.hostname.replace(/^www\./, "");

  const { price, currency } = extractPrice(
    document.documentElement.outerHTML.slice(0, 1_500_000),
    url,
    {
      price: parseAmount(meta("product:price:amount", "og:price:amount")),
      currency: meta("product:price:currency", "og:price:currency"),
    },
  );

  return {
    url,
    title: cleanTitle(title, [brand, site, location.hostname.replace(/^www\./, "").split(".")[0]]),
    brand: brand?.slice(0, 80),
    price,
    currency,
    images,
  };
}

// The popup calls this in a second executeScript (same isolated world).
(globalThis as unknown as { __wardrobeExtract: typeof extract }).__wardrobeExtract = extract;

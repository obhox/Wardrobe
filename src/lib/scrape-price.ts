// Price + currency extraction from a product page's HTML. Pure functions so
// they can be exercised without a network round-trip.
//
// Currency is resolved from the most to least trustworthy source:
//   1. structured data  (JSON-LD offers, og/product meta, itemprop microdata)
//   2. store config     (Shopify / embedded JSON "currency" fields, data-currency)
//   3. the symbol next to the visible price  (₦ 25,000 → NGN)
//   4. the shop's domain                     (.ng → NGN, .co.uk → GBP, …)
// If none match we return no currency, and the form keeps the user's own pick
// rather than guessing USD.

export interface PriceHit {
  price?: number;
  currency?: string;
}

// Symbols / words shops print → ISO code. Longest first so "CN¥" beats "¥".
const SYMBOLS: [string, string][] = [
  ["CN¥", "CNY"],
  ["RMB", "CNY"],
  ["元", "CNY"],
  ["US$", "USD"],
  ["NAIRA", "NGN"],
  ["₦", "NGN"],
  ["€", "EUR"],
  ["£", "GBP"],
  ["¥", "JPY"],
  ["円", "JPY"],
  ["₹", "INR"],
  ["₩", "KRW"],
  ["₺", "TRY"],
  ["₽", "RUB"],
  ["₱", "PHP"],
  ["₵", "GHS"],
  ["KSH", "KES"],
  ["R$", "BRL"],
  ["CA$", "CAD"],
  ["AU$", "AUD"],
  ["HK$", "HKD"],
  ["NZ$", "NZD"],
  ["C$", "CAD"],
  ["A$", "AUD"],
  ["$", "USD"],
];

const TLD_CURRENCY: [RegExp, string][] = [
  [/\.ng$/, "NGN"],
  [/\.(co\.)?uk$/, "GBP"],
  [/\.(jp|co\.jp)$/, "JPY"],
  [/\.(cn|com\.cn)$/, "CNY"],
  [/\.(de|fr|it|es|nl|be|at|ie|pt|fi|gr|sk|si|lt|lv|ee|lu|eu)$/, "EUR"],
  [/\.(in|co\.in)$/, "INR"],
  [/\.(ca)$/, "CAD"],
  [/\.(com\.)?au$/, "AUD"],
  [/\.(co\.)?za$/, "ZAR"],
  [/\.(co\.)?ke$/, "KES"],
  [/\.(com\.)?gh$/, "GHS"],
];

// Map a raw currency value (ISO code, symbol, or word) to an ISO code.
export function normalizeCurrency(raw: unknown): string | undefined {
  if (typeof raw !== "string") return undefined;
  const v = raw.trim().toUpperCase();
  if (!v) return undefined;
  if (/^[A-Z]{3}$/.test(v)) return v;
  return SYMBOLS.find(([sym]) => v === sym.toUpperCase())?.[1];
}

// Find a currency symbol/code inside a price string like "₦ 25,000" or "25,00 €".
export function currencyFromText(text: string): string | undefined {
  const t = text.toUpperCase();
  const code = t.match(/(?:^|[^A-Z])([A-Z]{3})(?=[^A-Z]|$)/)?.[1];
  if (code && KNOWN_CODES.has(code)) return code;
  for (const [sym, iso] of SYMBOLS) {
    if (t.includes(sym.toUpperCase())) return iso;
  }
  return undefined;
}

const KNOWN_CODES = new Set([
  ...SYMBOLS.map(([, iso]) => iso),
  ...TLD_CURRENCY.map(([, iso]) => iso),
  "CHF", "SEK", "NOK", "DKK", "PLN", "SGD", "HKD", "NZD", "MXN", "AED", "SAR", "EGP",
]);

export function currencyFromHost(url: string): string | undefined {
  try {
    const host = new URL(url).hostname.toLowerCase();
    return TLD_CURRENCY.find(([re]) => re.test(host))?.[1];
  } catch {
    return undefined;
  }
}

// Parse "25,000", "1.299,00", "1 299,99", "₦25,000.50", 19.99 → number.
export function parseAmount(raw: unknown): number | undefined {
  if (typeof raw === "number") return Number.isFinite(raw) ? raw : undefined;
  if (typeof raw !== "string") return undefined;
  const m = raw.match(/\d[\d.,\s  ']*/);
  if (!m) return undefined;
  let s = m[0].replace(/[\s  ']/g, "").replace(/[.,]+$/, "");
  const lastComma = s.lastIndexOf(",");
  const lastDot = s.lastIndexOf(".");
  if (lastComma > -1 && lastDot > -1) {
    // whichever separator comes last is the decimal point
    s = lastComma > lastDot ? s.replace(/\./g, "").replace(",", ".") : s.replace(/,/g, "");
  } else if (lastComma > -1) {
    // "25,000" / "1,299,000" are thousands; "19,99" is a decimal comma
    const decimals = s.length - lastComma - 1;
    s = (s.match(/,/g)!.length === 1 && decimals <= 2) ? s.replace(",", ".") : s.replace(/,/g, "");
  } else if ((s.match(/\./g) ?? []).length > 1) {
    s = s.replace(/\./g, ""); // "1.299.000"
  }
  const n = Number(s);
  return Number.isFinite(n) && n > 0 ? n : undefined;
}

// Walk parsed JSON-LD looking for an offer price, carrying currency down from
// parent offers (some shops put priceCurrency on AggregateOffer only).
function fromJsonLd(node: unknown, inherited?: string): PriceHit {
  if (!node || typeof node !== "object") return {};
  if (Array.isArray(node)) {
    for (const n of node) {
      const hit = fromJsonLd(n, inherited);
      if (hit.price !== undefined) return hit;
    }
    return {};
  }
  const obj = node as Record<string, unknown>;
  const currency = normalizeCurrency(obj.priceCurrency) ?? inherited;
  for (const key of ["@graph", "offers", "priceSpecification", "hasVariant", "itemListElement", "mainEntity"]) {
    if (obj[key]) {
      const hit = fromJsonLd(obj[key], currency);
      if (hit.price !== undefined) return hit;
    }
  }
  const raw = obj.price ?? obj.lowPrice;
  const price = parseAmount(raw);
  if (price !== undefined) {
    return { price, currency: currency ?? (typeof raw === "string" ? currencyFromText(raw) : undefined) };
  }
  return {};
}

// <meta property="x" content="y"> with the attributes in either order.
function meta(html: string, names: string): string | undefined {
  return (
    html.match(new RegExp(`<meta[^>]+(?:property|name|itemprop)=["'](?:${names})["'][^>]*content=["']([^"']+)["']`, "i"))?.[1] ??
    html.match(new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]*(?:property|name|itemprop)=["'](?:${names})["']`, "i"))?.[1]
  );
}

function decode(s: string) {
  return s
    .replace(/&nbsp;|&#160;/g, " ")
    .replace(/&#8358;|&#x20a6;/gi, "₦")
    .replace(/&euro;|&#8364;/gi, "€")
    .replace(/&pound;|&#163;/gi, "£")
    .replace(/&yen;|&#165;/gi, "¥")
    .replace(/&amp;/g, "&");
}

// Text of elements that look like the product price, e.g.
// <span class="price">₦ 25,000</span> or <div itemprop="price">…</div>.
function visiblePriceTexts(html: string): string[] {
  const out: string[] = [];
  const re = /<[a-z]+[^>]+(?:class|id|itemprop|data-testid)=["'][^"']*price[^"']*["'][^>]*>([^<]{1,60})</gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) && out.length < 20) {
    const text = decode(m[1]).trim();
    if (/\d/.test(text)) out.push(text);
  }
  return out;
}

// Currency declared in the store's config / embedded JSON.
function currencyFromConfig(html: string): string | undefined {
  const patterns = [
    /Shopify\.currency\s*=\s*\{\s*"active"\s*:\s*"([A-Z]{3})"/,
    /"priceCurrency"\s*:\s*"([A-Za-z]{3})"/,
    /"currency(?:Code|_code|_iso)?"\s*:\s*"([A-Z]{3})"/,
    /itemprop=["']priceCurrency["'][^>]*content=["']([A-Za-z]{3})["']/i,
    /data-currency(?:-code)?=["']([A-Z]{3})["']/,
  ];
  for (const re of patterns) {
    const code = normalizeCurrency(html.match(re)?.[1]);
    if (code) return code;
  }
  return undefined;
}

export function extractPrice(html: string, url: string, og: PriceHit = {}): PriceHit {
  let price = og.price;
  let currency = normalizeCurrency(og.currency);

  // 1) JSON-LD
  if (price === undefined || !currency) {
    const ldRe = /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
    let m: RegExpExecArray | null;
    while ((m = ldRe.exec(html))) {
      try {
        const hit = fromJsonLd(JSON.parse(m[1].trim()));
        if (hit.price !== undefined) {
          if (price === undefined) price = hit.price;
          currency ??= hit.currency;
          break;
        }
      } catch {
        /* malformed block — skip */
      }
    }
  }

  // 2) meta / microdata
  if (price === undefined) {
    price = parseAmount(
      meta(html, "product:price:amount|og:price:amount|price") ??
        html.match(/itemprop=["']price["'][^>]*content=["']([^"']+)["']/i)?.[1],
    );
  }
  currency ??= normalizeCurrency(meta(html, "product:price:currency|og:price:currency|priceCurrency"));

  // 3) store config
  currency ??= currencyFromConfig(html);

  // 4) visible price text — the symbol printed next to the price
  const texts = visiblePriceTexts(html);
  if (price === undefined) {
    for (const t of texts) {
      const n = parseAmount(t);
      if (n !== undefined) {
        price = n;
        currency ??= currencyFromText(t);
        break;
      }
    }
  }
  if (!currency) {
    for (const t of texts) {
      const c = currencyFromText(t);
      if (c) {
        currency = c;
        break;
      }
    }
  }
  // a bare "$" on a Canadian / Australian shop means their dollar, not USD
  if (currency === "USD" && !og.currency) {
    const host = currencyFromHost(url);
    if (host === "CAD" || host === "AUD") currency = host;
  }

  // 5) the shop's domain
  currency ??= currencyFromHost(url);

  return { price, currency };
}

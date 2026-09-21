// Helpers for product links people paste in. Shared by the add-item form and
// the scrape route, so client and server agree on what "the link" is.

// App share sheets paste text around the link, e.g.
// "Check out this item on Temu! https://share.temu.com/abc". Pull the first
// http(s) URL out of whatever was pasted.
export function extractUrl(text: string): string | null {
  const m = text.match(/https?:\/\/[^\s<>"']+/i);
  if (!m) return null;
  const url = m[0].replace(/[),.;!?]+$/, "");
  try {
    return new URL(url).toString();
  } catch {
    return null;
  }
}

// Shops that serve servers a bot check or an empty JS shell instead of the
// product page, so a link preview can never read their title or photo.
const UNREADABLE = [/(^|\.)aliexpress\.[a-z.]+$/, /(^|\.)temu\.com$/];

export function shopName(url: string): string | null {
  try {
    const host = new URL(url).hostname.toLowerCase();
    if (/aliexpress/.test(host)) return "aliexpress";
    if (/temu/.test(host)) return "temu";
    return null;
  } catch {
    return null;
  }
}

export function isUnreadableShop(url: string): boolean {
  try {
    const host = new URL(url).hostname.toLowerCase();
    return UNREADABLE.some((re) => re.test(host));
  } catch {
    return false;
  }
}

// Best-effort product name from the URL path, e.g.
// temu.com/womens-casual-linen-dress-g-601099512399871.html → "womens casual linen dress".
export function titleFromUrl(url: string): string | undefined {
  try {
    const segs = new URL(url).pathname.split("/").filter(Boolean);
    for (const seg of segs.reverse()) {
      const slug = decodeURIComponent(seg)
        .replace(/\.html?$/i, "")
        .replace(/-g-\d+$/i, "") // temu product id suffix
        .replace(/[-_]\d{5,}$/, ""); // trailing numeric ids
      const words = slug.split(/[-_+]+/).filter((w) => /[a-z]/i.test(w));
      if (words.length >= 2) return words.join(" ").toLowerCase().slice(0, 120);
    }
  } catch {
    /* not a URL */
  }
  return undefined;
}

// Turn protocol-relative ("//cdn…") / relative image paths into absolute URLs.
export function absoluteUrl(src: string | undefined, base: string): string | undefined {
  if (!src) return undefined;
  try {
    const u = new URL(src.trim(), base);
    return u.protocol === "https:" || u.protocol === "http:" ? u.toString() : undefined;
  } catch {
    return undefined;
  }
}

// Lenient normalisers for the items API: shop titles and share links are
// messy, and a too-long name should be trimmed, not make the whole save fail.
export function clip(max: number) {
  return (v: unknown) => (typeof v === "string" ? v.trim().slice(0, max) : v);
}

export function looseUrl(v: unknown) {
  if (typeof v !== "string") return v;
  const s = v.trim();
  if (!s) return null;
  if (/^data:image\//i.test(s)) return s; // uploaded photos
  if (s.startsWith("//")) return `https:${s}`;
  return extractUrl(s) ?? null;
}

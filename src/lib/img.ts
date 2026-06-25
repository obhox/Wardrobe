// Route external item images through our own origin so they're same-origin.
// This keeps screenshots un-tainted (html-to-image can inline same-origin
// images) and avoids third-party hotlink/CORS quirks. data:, blob: and
// already-relative URLs are left untouched.
export function proxiedSrc(url: string | null | undefined): string {
  if (!url) return "";
  if (/^(data:|blob:|\/)/i.test(url)) return url;
  if (/^https?:\/\//i.test(url)) return `/api/img?url=${encodeURIComponent(url)}`;
  return url;
}

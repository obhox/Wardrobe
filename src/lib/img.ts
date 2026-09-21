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

// Shrink an uploaded photo before it's stored as a data URL. Phone photos and
// app screenshots can be 5–10MB, which makes saves slow or fail outright.
// Keeps transparency (WebP, or PNG where the browser can't encode WebP).
export function downscaleImage(file: File, maxSide = 1200): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error);
    reader.onload = () => {
      const src = String(reader.result);
      const img = new Image();
      img.onerror = () => resolve(src); // unknown format — keep the original
      img.onload = () => {
        const scale = Math.min(1, maxSide / Math.max(img.width, img.height));
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        const ctx = canvas.getContext("2d");
        if (!ctx) return resolve(src);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        const webp = canvas.toDataURL("image/webp", 0.86);
        const out = webp.startsWith("data:image/webp") ? webp : canvas.toDataURL("image/png");
        resolve(out.length < src.length ? out : src);
      };
      img.src = src;
    };
    reader.readAsDataURL(file);
  });
}

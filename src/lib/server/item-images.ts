import "server-only";
import { decodeDataUrl, ingestRemoteImage, storageConfigured, storeImage } from "./images";
import { keyFromUrl } from "./storage";

// Make an item image reference durable: data: URLs and third-party links are
// copied into our bucket. If a remote copy fails (hotlink protection, a
// transient error) the original link is kept and served via /api/img.
export async function persistImage(
  userId: string,
  url: string | null | undefined,
  kind: "original" | "cutout"
): Promise<string | null | undefined> {
  if (!url || !storageConfigured() || keyFromUrl(url)) return url;
  if (url.startsWith("data:")) {
    const buf = decodeDataUrl(url);
    if (!buf) return null;
    return storeImage(userId, buf, kind);
  }
  try {
    return await ingestRemoteImage(userId, url);
  } catch {
    return url;
  }
}

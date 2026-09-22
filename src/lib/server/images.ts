import "server-only";
import sharp from "sharp";
import { RASTER_TYPES, safeFetch, sniffImage } from "./safe-fetch";
import { newImageKey, putObject, storageConfigured } from "./storage";

// Normalise any accepted image into a web-friendly WebP: validates the real
// format, strips metadata (EXIF/GPS), auto-rotates and bounds the size.

export const MAX_UPLOAD_BYTES = 12 * 1024 * 1024;
const MAX_SIDE = 1600;

export class ImageError extends Error {}

export async function toWebp(input: Buffer, { keepAlpha = true } = {}): Promise<Buffer> {
  const type = sniffImage(input);
  if (!type || !RASTER_TYPES.has(type)) throw new ImageError("that isn't a photo we can read");
  try {
    return await sharp(input, { failOn: "error", limitInputPixels: 60_000_000, animated: false })
      .rotate()
      .resize({ width: MAX_SIDE, height: MAX_SIDE, fit: "inside", withoutEnlargement: true })
      .webp({ quality: 84, alphaQuality: keepAlpha ? 90 : 100, effort: 4 })
      .toBuffer();
  } catch {
    throw new ImageError("couldn't read that photo — try another?");
  }
}

export async function storeImage(userId: string, input: Buffer, kind: "original" | "cutout") {
  const webp = await toWebp(input);
  return putObject(newImageKey(userId, kind), webp, "image/webp");
}

// Pull a remote image (e.g. a shop's product photo) into our bucket so items
// don't hotlink — shop CDNs rotate URLs and block hotlinking.
export async function ingestRemoteImage(userId: string, url: string): Promise<string> {
  const res = await safeFetch(url, { accept: "image/avif,image/webp,image/*;q=0.8", maxBytes: MAX_UPLOAD_BYTES });
  if (!res.ok) throw new ImageError(`couldn't fetch that image (${res.status})`);
  return storeImage(userId, res.body, "original");
}

export function decodeDataUrl(dataUrl: string): Buffer | null {
  const m = dataUrl.match(/^data:image\/[a-z0-9.+-]+;base64,(.+)$/i);
  return m ? Buffer.from(m[1], "base64") : null;
}

export { storageConfigured };

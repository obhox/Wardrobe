import { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { hit, LIMITS } from "@/lib/auth/rate-limit";
import { ImageError, MAX_UPLOAD_BYTES, storageConfigured, storeImage, toWebp } from "@/lib/server/images";
import { error, json, tooMany, unauthorized } from "@/lib/server/http";

export const dynamic = "force-dynamic";

// POST multipart { file, kind? } → { url }
// Validates the real format, strips metadata, resizes to WebP and stores it
// in the bucket. Without a bucket (local dev) it returns a data: URL instead.
export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return unauthorized();

  const rate = await hit(`upload:${user.id}`, LIMITS.uploadPerUser);
  if (!rate.allowed) return tooMany(rate.retryAfterMs);

  const len = Number(req.headers.get("content-length") ?? 0);
  if (len > MAX_UPLOAD_BYTES + 64 * 1024) return error("that photo is too big (12 MB max)", 413);

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return error("no photo received", 400);
  }
  const file = form.get("file");
  if (!(file instanceof Blob)) return error("no photo received", 400);
  if (file.size > MAX_UPLOAD_BYTES) return error("that photo is too big (12 MB max)", 413);
  const kind = form.get("kind") === "cutout" ? "cutout" : "original";

  try {
    const buf = Buffer.from(await file.arrayBuffer());
    if (!storageConfigured()) {
      const webp = await toWebp(buf);
      return json({ url: `data:image/webp;base64,${webp.toString("base64")}`, stored: false });
    }
    return json({ url: await storeImage(user.id, buf, kind), stored: true });
  } catch (e) {
    if (e instanceof ImageError) return error(e.message, 415);
    console.error("[upload] failed", e);
    return error("couldn't save that photo — try again", 500);
  }
}

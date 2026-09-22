// One-off: move photos stored inline as data: URLs (and, with --remote, shop
// hotlinks) into the S3 bucket, rewriting the Item rows.
//
//   npx tsx scripts/migrate-inline-images.ts            # data: URLs only
//   npx tsx scripts/migrate-inline-images.ts --remote   # also copy remote links
//   add --dry-run to just count
//
// Needs DATABASE_URL and the S3_* variables.

import { PrismaClient } from "@prisma/client";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import sharp from "sharp";
import crypto from "node:crypto";

const prisma = new PrismaClient();
const dry = process.argv.includes("--dry-run");
const remote = process.argv.includes("--remote");

const need = ["S3_BUCKET", "S3_ACCESS_KEY_ID", "S3_SECRET_ACCESS_KEY", "S3_PUBLIC_URL"];
for (const k of need) if (!process.env[k]) throw new Error(`missing ${k}`);
const base = process.env.S3_PUBLIC_URL!.replace(/\/+$/, "");

const s3 = new S3Client({
  region: process.env.S3_REGION || "auto",
  endpoint: process.env.S3_ENDPOINT || undefined,
  forcePathStyle: process.env.S3_FORCE_PATH_STYLE === "true",
  credentials: { accessKeyId: process.env.S3_ACCESS_KEY_ID!, secretAccessKey: process.env.S3_SECRET_ACCESS_KEY! },
});

async function toBuffer(url: string): Promise<Buffer | null> {
  const m = url.match(/^data:image\/[a-z0-9.+-]+;base64,(.+)$/i);
  if (m) return Buffer.from(m[1], "base64");
  if (remote && /^https?:\/\//.test(url) && !url.startsWith(base)) {
    const res = await fetch(url, { signal: AbortSignal.timeout(15000) });
    return res.ok ? Buffer.from(await res.arrayBuffer()) : null;
  }
  return null;
}

async function store(userId: string, buf: Buffer, kind: string) {
  const webp = await sharp(buf).rotate().resize(1600, 1600, { fit: "inside", withoutEnlargement: true }).webp({ quality: 84 }).toBuffer();
  const key = `u/${userId}/${crypto.randomBytes(12).toString("base64url")}-${kind}.webp`;
  await s3.send(new PutObjectCommand({ Bucket: process.env.S3_BUCKET!, Key: key, Body: webp, ContentType: "image/webp", CacheControl: "public, max-age=31536000, immutable" }));
  return `${base}/${key}`;
}

async function main() {
  const items = await prisma.item.findMany({
    where: remote ? {} : { OR: [{ imageUrl: { startsWith: "data:" } }, { cutoutUrl: { startsWith: "data:" } }] },
    select: { id: true, imageUrl: true, cutoutUrl: true, wardrobe: { select: { ownerId: true } } },
  });
  let moved = 0;
  let failed = 0;
  for (const it of items) {
    const patch: { imageUrl?: string; cutoutUrl?: string | null } = {};
    try {
      const img = await toBuffer(it.imageUrl);
      if (img && !dry) patch.imageUrl = await store(it.wardrobe.ownerId, img, "original");
      if (it.cutoutUrl && it.cutoutUrl === it.imageUrl) patch.cutoutUrl = null; // old copies of the original
      else if (it.cutoutUrl) {
        const cut = await toBuffer(it.cutoutUrl);
        if (cut && !dry) patch.cutoutUrl = await store(it.wardrobe.ownerId, cut, "cutout");
      }
      if (!dry && Object.keys(patch).length) await prisma.item.update({ where: { id: it.id }, data: patch });
      if (img) moved++;
    } catch (e) {
      failed++;
      console.error("✗", it.id, e instanceof Error ? e.message : e);
    }
  }
  console.log(`${dry ? "would move" : "moved"} ${moved} of ${items.length} items (${failed} failed)`);
}

main().finally(() => prisma.$disconnect());

import "server-only";
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectsCommand,
  ListObjectsV2Command,
} from "@aws-sdk/client-s3";
import crypto from "node:crypto";

// S3-compatible object storage for item photos and cutouts (R2, Supabase
// Storage, MinIO, AWS…). Objects are public-read images addressed by an
// unguessable key; the database stores only their URL.
//
//   S3_ENDPOINT          e.g. https://<account>.r2.cloudflarestorage.com (omit for AWS)
//   S3_REGION            e.g. auto / us-east-1
//   S3_BUCKET
//   S3_ACCESS_KEY_ID / S3_SECRET_ACCESS_KEY
//   S3_PUBLIC_URL        public base URL for the bucket, e.g. https://img.example.com
//   S3_FORCE_PATH_STYLE  "true" for MinIO

export function storageConfigured(): boolean {
  return Boolean(
    process.env.S3_BUCKET &&
      process.env.S3_ACCESS_KEY_ID &&
      process.env.S3_SECRET_ACCESS_KEY &&
      process.env.S3_PUBLIC_URL
  );
}

let client: S3Client | null = null;
function s3(): S3Client {
  if (!client) {
    client = new S3Client({
      region: process.env.S3_REGION || "auto",
      endpoint: process.env.S3_ENDPOINT || undefined,
      forcePathStyle: process.env.S3_FORCE_PATH_STYLE === "true",
      credentials: {
        accessKeyId: process.env.S3_ACCESS_KEY_ID!,
        secretAccessKey: process.env.S3_SECRET_ACCESS_KEY!,
      },
    });
  }
  return client;
}

function bucket() {
  return process.env.S3_BUCKET!;
}

export function publicBase(): string {
  return (process.env.S3_PUBLIC_URL ?? "").replace(/\/+$/, "");
}

export function publicUrl(key: string): string {
  return `${publicBase()}/${key}`;
}

// true when a URL points into our own bucket (so we can delete it later)
export function keyFromUrl(url: string | null | undefined): string | null {
  const base = publicBase();
  if (!url || !base || !url.startsWith(base + "/")) return null;
  return url.slice(base.length + 1);
}

export function userPrefix(userId: string) {
  return `u/${userId}/`;
}

export function newImageKey(userId: string, kind: "original" | "cutout") {
  return `${userPrefix(userId)}${crypto.randomBytes(12).toString("base64url")}-${kind}.webp`;
}

export async function putObject(key: string, body: Buffer, contentType: string) {
  await s3().send(
    new PutObjectCommand({
      Bucket: bucket(),
      Key: key,
      Body: body,
      ContentType: contentType,
      CacheControl: "public, max-age=31536000, immutable",
    })
  );
  return publicUrl(key);
}

export async function deleteKeys(keys: string[]) {
  const list = keys.filter(Boolean);
  for (let i = 0; i < list.length; i += 1000) {
    await s3().send(
      new DeleteObjectsCommand({
        Bucket: bucket(),
        Delete: { Objects: list.slice(i, i + 1000).map((Key) => ({ Key })), Quiet: true },
      })
    );
  }
}

// Remove the bucket objects behind these URLs (ignores foreign URLs).
export async function deleteUrls(urls: (string | null | undefined)[]) {
  if (!storageConfigured()) return;
  const keys = urls.map(keyFromUrl).filter((k): k is string => !!k);
  if (keys.length) await deleteKeys(keys).catch((e) => console.error("[storage] delete failed", e));
}

export async function deletePrefix(prefix: string) {
  if (!storageConfigured()) return;
  let token: string | undefined;
  do {
    const page = await s3().send(
      new ListObjectsV2Command({ Bucket: bucket(), Prefix: prefix, ContinuationToken: token })
    );
    const keys = (page.Contents ?? []).map((o) => o.Key!).filter(Boolean);
    if (keys.length) await deleteKeys(keys);
    token = page.IsTruncated ? page.NextContinuationToken : undefined;
  } while (token);
}

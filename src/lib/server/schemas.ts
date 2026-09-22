import "server-only";
import { z } from "zod";
import { clip, looseUrl } from "@/lib/links";
import { storageConfigured } from "./storage";

// Shared request validation. Enums mirror src/lib/types.ts.

export const groundSchema = z.union([
  z.enum(["daylight", "bone", "sage", "butter", "bubblegum", "slate"]),
  z.string().regex(/^#[0-9a-f]{6}$/i).transform((s) => s.toLowerCase()),
]);
export const patternSchema = z.enum(["none", "grid", "dots", "polka", "gingham"]);
export const accentSchema = z.enum(["blush", "olive", "honey", "brass", "cobalt", "terracotta"]);
export const layoutSchema = z.enum(["free", "grid", "shelves", "columns", "gallery"]);
export const sortSchema = z.enum(["recent", "color", "section", "status", "az"]);
export const sizeTierSchema = z.enum(["hero", "large", "medium", "small"]);
export const stickerKindSchema = z.enum([
  "star", "cat", "scribble", "washi", "shrug", "corner", "heart", "flower", "sparkle",
]);

// canvas fractions: a little slack past the edges is fine, nonsense isn't
export const fraction = z.number().finite().min(-0.5).max(1.5);
export const rotation = z.number().finite().min(-360).max(360);
export const money = z.number().finite().nonnegative().max(1e10);

const MAX_INLINE_IMAGE = 3_000_000; // chars of a data: URL (dev without storage)

// An image reference: an http(s) URL, or — only when no bucket is configured
// (local dev) — a bounded data: URL.
export const imageRef = z.preprocess(
  looseUrl,
  z
    .string()
    .min(1)
    .max(MAX_INLINE_IMAGE)
    .refine(
      (s) =>
        /^https?:\/\//i.test(s) ||
        (/^data:image\/(png|jpe?g|webp|gif|avif);base64,/i.test(s) && !storageConfigured()),
      "unsupported image"
    )
);

export const optionalImageRef = z.preprocess(
  (v) => (v === "" ? null : v),
  imageRef.nullable().optional()
);

export const sourceUrl = z.preprocess(
  looseUrl,
  z.string().max(4000).refine((s) => /^https?:\/\//i.test(s), "must be a link").nullable().optional()
);

// "" from a <select> means "unsorted"
export const sectionRef = z.preprocess(
  (v) => (v === "" ? null : v),
  z.string().max(40).nullable().optional()
);

export const itemFields = {
  name: z.preprocess(clip(120), z.string().min(1)),
  brand: z.preprocess(clip(80), z.string().nullable().optional()),
  price: money.nullable().optional(),
  currency: z.string().max(8).nullable().optional(),
  status: z.enum(["owned", "want"]),
  boughtAt: z.preprocess(clip(120), z.string().nullable().optional()),
  purchasedAt: z.preprocess(
    (v) => (v === "" ? null : v),
    z.coerce.date().min(new Date("1900-01-01")).max(new Date("2200-01-01")).nullable().optional()
  ),
  notes: z.preprocess(clip(2000), z.string().nullable().optional()),
  targetPrice: money.nullable().optional(),
  priority: z.number().int().min(0).max(5).nullable().optional(),
  sectionId: sectionRef,
  sizeTier: sizeTierSchema,
  hue: z.number().int().min(-1).max(360),
  posX: fraction,
  posY: fraction,
  rotation,
  priceAlert: z.boolean(),
};

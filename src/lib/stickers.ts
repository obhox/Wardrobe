import type { StickerKind } from "./types";

// Decorative scrapbook bits (brief §17) — pure ASCII / glyph joy.
export const STICKERS: { kind: StickerKind; glyph: string; label: string }[] = [
  { kind: "star", glyph: "✦", label: "star" },
  { kind: "sparkle", glyph: "⋆｡˚✧", label: "sparkles" },
  { kind: "heart", glyph: "♡", label: "heart" },
  { kind: "flower", glyph: "✿", label: "flower" },
  { kind: "cat", glyph: "ฅ^•ﻌ•^ฅ", label: "cat" },
  { kind: "scribble", glyph: "〜〜", label: "scribble" },
  { kind: "shrug", glyph: "¯\\_(ツ)_/¯", label: "shrug" },
  { kind: "washi", glyph: "", label: "washi tape" },
  { kind: "corner", glyph: "", label: "tape corner" },
];

export const STICKER_GLYPH: Record<StickerKind, string> = Object.fromEntries(
  STICKERS.map((s) => [s.kind, s.glyph])
) as Record<StickerKind, string>;

export const STICKER_LABEL: Record<StickerKind, string> = Object.fromEntries(
  STICKERS.map((s) => [s.kind, s.label])
) as Record<StickerKind, string>;

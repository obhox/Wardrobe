import type { Ground, Pattern, Accent, SizeTier } from "./types";

export const GROUNDS: { id: Ground; label: string; swatch: string }[] = [
  { id: "daylight", label: "daylight", swatch: "#a9c4f5" },
  { id: "bone", label: "bone", swatch: "#f3efe6" },
  { id: "sage", label: "sage mist", swatch: "#d7e0cc" },
  { id: "butter", label: "butter", swatch: "#f6e6b8" },
  { id: "bubblegum", label: "bubblegum", swatch: "#f4d3de" },
  { id: "slate", label: "slate", swatch: "#1f2330" },
];

export const PATTERNS: { id: Pattern; label: string }[] = [
  { id: "none", label: "none" },
  { id: "grid", label: "grid paper" },
  { id: "dots", label: "dots" },
  { id: "polka", label: "polka" },
  { id: "gingham", label: "gingham" },
];

export const ACCENTS: { id: Accent; hex: string }[] = [
  { id: "blush", hex: "#f47d7d" },
  { id: "olive", hex: "#6f8d5c" },
  { id: "honey", hex: "#f2c87d" },
  { id: "brass", hex: "#c79a37" },
  { id: "cobalt", hex: "#5a82b6" },
  { id: "terracotta", hex: "#b9633d" },
];

export const ACCENT_HEX: Record<Accent, string> = Object.fromEntries(
  ACCENTS.map((a) => [a.id, a.hex])
) as Record<Accent, string>;

export const PATTERN_CLASS: Record<Pattern, string> = {
  none: "",
  grid: "pattern-grid",
  dots: "pattern-dots",
  polka: "pattern-polka",
  gingham: "pattern-gingham",
};

// theme presets (brief §17): bundle ground + pattern + accent
export const PRESETS: {
  id: string;
  label: string;
  ground: Ground;
  pattern: Pattern;
  accent: Accent;
}[] = [
  { id: "daylight", label: "daylight", ground: "daylight", pattern: "none", accent: "cobalt" },
  { id: "bone-studio", label: "bone studio", ground: "bone", pattern: "grid", accent: "brass" },
  { id: "midnight", label: "midnight", ground: "slate", pattern: "dots", accent: "honey" },
  { id: "bubblegum", label: "bubblegum", ground: "bubblegum", pattern: "polka", accent: "blush" },
];

// longest-edge sizes per tier (brief §15)
export const TIER_SIZE: Record<SizeTier, number> = {
  hero: 200,
  large: 140,
  medium: 110,
  small: 80,
};

export const SIZE_TIERS: SizeTier[] = ["small", "medium", "large", "hero"];

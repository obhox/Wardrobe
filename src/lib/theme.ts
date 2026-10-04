import type { SectionColor, SizeTier, ThemeId } from "./types";

// A wardrobe's look is one curated theme: it sets the ground, ink, shadow and
// accent together (the tokens live in globals.css under [data-theme]).
export const THEMES: { id: ThemeId; label: string; swatch: string }[] = [
  { id: "paper", label: "paper", swatch: "#faf9f6" },
  { id: "bone", label: "bone", swatch: "#f3efe6" },
  { id: "sage", label: "sage", swatch: "#d7e0cc" },
  { id: "butter", label: "butter", swatch: "#f6e6b8" },
  { id: "rose", label: "rose", swatch: "#f4d3de" },
  { id: "mist", label: "mist", swatch: "#a9c4f5" },
  { id: "ink", label: "ink", swatch: "#1f2330" },
];

export const DEFAULT_THEME: ThemeId = "paper";

// grounds from before themes were curated, and the theme each became
const LEGACY_GROUND: Record<string, ThemeId> = {
  daylight: "mist",
  bubblegum: "rose",
  slate: "ink",
};

/** A stored theme (or an older ground name) → a current theme id. */
export function toThemeId(value: string | null | undefined): ThemeId {
  if (!value) return DEFAULT_THEME;
  if (THEMES.some((t) => t.id === value)) return value as ThemeId;
  return LEGACY_GROUND[value] ?? DEFAULT_THEME;
}

// the dot colours a section can take in the directory
export const SECTION_COLORS: { id: SectionColor; hex: string }[] = [
  { id: "blush", hex: "#f47d7d" },
  { id: "olive", hex: "#6f8d5c" },
  { id: "honey", hex: "#f2c87d" },
  { id: "brass", hex: "#c79a37" },
  { id: "cobalt", hex: "#5a82b6" },
  { id: "terracotta", hex: "#b9633d" },
];

export const SECTION_COLOR_HEX: Record<SectionColor, string> = Object.fromEntries(
  SECTION_COLORS.map((c) => [c.id, c.hex])
) as Record<SectionColor, string>;

// longest-edge sizes per tier (brief §15)
export const TIER_SIZE: Record<SizeTier, number> = {
  hero: 200,
  large: 140,
  medium: 110,
  small: 80,
};

export const SIZE_TIERS: SizeTier[] = ["small", "medium", "large", "hero"];

// Shared client/server types. Kept framework-light so both server route
// handlers and client components can import them.

export type ItemStatus = "owned" | "want";
export type SourceType = "manual" | "scraped";
export type LayoutMode = "free" | "grid" | "shelves" | "columns" | "gallery";
export type SortKey = "recent" | "color" | "section" | "status" | "az";
export type SizeTier = "hero" | "large" | "medium" | "small";

export type Ground =
  | "daylight"
  | "bone"
  | "sage"
  | "butter"
  | "bubblegum"
  | "slate";

export type Pattern = "none" | "grid" | "dots" | "polka" | "gingham";

export type Accent =
  | "blush"
  | "olive"
  | "honey"
  | "brass"
  | "cobalt"
  | "terracotta";

export type StickerKind = "star" | "cat" | "scribble" | "washi" | "shrug";

export interface Section {
  id: string;
  name: string;
  icon?: string | null;
  color?: string | null;
  order: number;
  count?: number;
  shared?: boolean;
}

export interface Item {
  id: string;
  sectionId?: string | null;
  imageUrl: string;
  cutoutUrl?: string | null;
  sourceUrl?: string | null;
  name: string;
  brand?: string | null;
  price?: number | null;
  currency?: string | null;
  status: ItemStatus;
  boughtAt?: string | null;
  purchasedAt?: string | null;
  notes?: string | null;
  targetPrice?: number | null;
  priority?: number | null;
  posX: number;
  posY: number;
  rotation: number;
  sizeTier: SizeTier;
  hue: number;
  sourceType: SourceType;
  createdAt: string;
}

export interface Sticker {
  id: string;
  kind: StickerKind;
  posX: number;
  posY: number;
  rotation: number;
  scale: number;
}

export interface WardrobeTheme {
  ground: Ground;
  pattern: Pattern;
  accent: Accent;
}

export interface Wardrobe {
  id: string;
  title: string;
  tagline?: string | null;
  theme: WardrobeTheme;
  layoutMode: LayoutMode;
  sortKey: SortKey;
  handle: string;
  visibility: string;
  shareCode?: string | null;
  shareDetails?: boolean;
}

export interface WardrobePayload {
  wardrobe: Wardrobe;
  sections: Section[];
  items: Item[];
  stickers: Sticker[];
}

export interface ScrapeResult {
  ok: boolean;
  imageUrl?: string;
  title?: string;
  price?: number;
  currency?: string;
  brand?: string;
  sourceUrl: string;
}

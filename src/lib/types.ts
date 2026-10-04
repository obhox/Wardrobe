// Shared client/server types. Kept framework-light so both server route
// handlers and client components can import them.

export type ItemStatus = "owned" | "want";
export type SourceType = "manual" | "scraped";
// "free" is the hand-placed collage, "grid" the scrolling board
export type LayoutMode = "free" | "grid";
export type SortKey = "recent" | "color" | "section" | "status" | "az";
export type SizeTier = "hero" | "large" | "medium" | "small";

// a wardrobe's look: ground, ink, shadow and accent chosen together
export type ThemeId = "paper" | "bone" | "sage" | "butter" | "rose" | "mist" | "ink";

export type SectionColor =
  | "blush"
  | "olive"
  | "honey"
  | "brass"
  | "cobalt"
  | "terracotta";

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
  wardrobeId?: string;
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
  priceAlert?: boolean;
  lowestPrice?: number | null;
  lastCheckedAt?: string | null;
  createdAt: string;
}

export interface Wardrobe {
  id: string;
  title: string;
  tagline?: string | null;
  icon?: string | null;
  theme: ThemeId;
  layoutMode: LayoutMode;
  sortKey: SortKey;
  handle: string;
  visibility: string;
  shareCode?: string | null;
  shareDetails?: boolean;
}

export interface WardrobeSummary {
  id: string;
  title: string;
  icon?: string | null;
  order: number;
  count: number;
}

export interface WardrobePayload {
  wardrobe: Wardrobe;
  sections: Section[];
  items: Item[];
  wardrobes: WardrobeSummary[];
  // public base URL of the image bucket (images there skip the proxy)
  storageBase?: string | null;
}

export interface PricePoint {
  price: number;
  currency: string | null;
  checkedAt: string;
}

export interface AppNotification {
  id: string;
  kind: "price_drop" | "target_hit";
  itemId: string | null;
  body: string;
  readAt: string | null;
  createdAt: string;
}

export interface StatsBucket {
  key: string;
  label: string;
  count: number;
  value: number;
}

export interface WardrobeStats {
  currency: string;
  owned: { count: number; value: number };
  want: { count: number; value: number; targetGap: number };
  bySection: StatsBucket[];
  byBrand: StatsBucket[];
  hues: number[]; // one per item that has colour
  recent: { id: string; name: string; createdAt: string }[];
  drops: { id: string; name: string; from: number; to: number; currency: string | null }[];
  unconverted: number; // items whose currency we couldn't convert
}

export interface ScrapeResult {
  ok: boolean;
  imageUrl?: string;
  title?: string;
  price?: number;
  currency?: string;
  brand?: string;
  sourceUrl: string;
  // set for shops (aliexpress, temu) that never show their product page to a
  // link preview — the form asks for a photo instead of saying "couldn't read"
  shop?: string;
}

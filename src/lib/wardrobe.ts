import "server-only";
import { prisma } from "@/lib/db";
import { publicBase } from "@/lib/server/storage";
import type {
  WardrobePayload,
  WardrobeSummary,
  Item,
  Section,
  Sticker,
  Ground,
  Pattern,
  Accent,
  LayoutMode,
  SortKey,
  SizeTier,
  ItemStatus,
  SourceType,
} from "@/lib/types";
import type { Item as DbItem } from "@prisma/client";

// A person can keep several wardrobes (closet, wishlist, gear…). Every
// request names the one it means; when it doesn't (older clients, the
// extension) we fall back to the last one they opened.

export async function listWardrobes(userId: string): Promise<WardrobeSummary[]> {
  const rows = await prisma.wardrobe.findMany({
    where: { ownerId: userId },
    orderBy: [{ order: "asc" }, { createdAt: "asc" }],
    select: { id: true, title: true, icon: true, order: true, _count: { select: { items: true } } },
  });
  return rows.map((w) => ({
    id: w.id,
    title: w.title,
    icon: w.icon,
    order: w.order,
    count: w._count.items,
  }));
}

/** The wardrobe id to use for a request: the requested one if the user owns it,
 *  else their last-opened one, else their first. Null if they own none. */
export async function resolveWardrobeId(
  userId: string,
  requested?: string | null,
  lastWardrobeId?: string | null
): Promise<string | null> {
  if (requested) {
    const w = await prisma.wardrobe.findFirst({
      where: { id: requested, ownerId: userId },
      select: { id: true },
    });
    return w?.id ?? null;
  }
  if (lastWardrobeId) {
    const w = await prisma.wardrobe.findFirst({
      where: { id: lastWardrobeId, ownerId: userId },
      select: { id: true },
    });
    if (w) return w.id;
  }
  const first = await prisma.wardrobe.findFirst({
    where: { ownerId: userId },
    orderBy: [{ order: "asc" }, { createdAt: "asc" }],
    select: { id: true },
  });
  return first?.id ?? null;
}

export function toItem(i: DbItem): Item {
  return {
    id: i.id,
    wardrobeId: i.wardrobeId,
    sectionId: i.sectionId,
    imageUrl: i.imageUrl,
    cutoutUrl: i.cutoutUrl,
    sourceUrl: i.sourceUrl,
    name: i.name,
    brand: i.brand,
    price: i.price,
    currency: i.currency,
    status: i.status as ItemStatus,
    boughtAt: i.boughtAt,
    purchasedAt: i.purchasedAt?.toISOString() ?? null,
    notes: i.notes,
    targetPrice: i.targetPrice,
    priority: i.priority,
    posX: i.posX,
    posY: i.posY,
    rotation: i.rotation,
    sizeTier: i.sizeTier as SizeTier,
    hue: i.hue,
    sourceType: i.sourceType as SourceType,
    priceAlert: i.priceAlert,
    lowestPrice: i.lowestPrice,
    lastCheckedAt: i.lastCheckedAt?.toISOString() ?? null,
    createdAt: i.createdAt.toISOString(),
  };
}

export async function loadWardrobe(
  userId: string,
  wardrobeId: string
): Promise<WardrobePayload | null> {
  const wardrobe = await prisma.wardrobe.findFirst({
    where: { id: wardrobeId, ownerId: userId },
    include: {
      sections: { orderBy: { order: "asc" } },
      items: { orderBy: { createdAt: "asc" } },
      stickers: true,
      owner: { select: { handle: true } },
    },
  });
  if (!wardrobe) return null;

  const counts = new Map<string, number>();
  for (const it of wardrobe.items) {
    if (it.sectionId) counts.set(it.sectionId, (counts.get(it.sectionId) ?? 0) + 1);
  }

  const sections: Section[] = wardrobe.sections.map((s) => ({
    id: s.id,
    name: s.name,
    icon: s.icon,
    color: s.color,
    order: s.order,
    count: counts.get(s.id) ?? 0,
    shared: s.shared,
  }));

  const stickers: Sticker[] = wardrobe.stickers.map((s) => ({
    id: s.id,
    kind: s.kind as Sticker["kind"],
    posX: s.posX,
    posY: s.posY,
    rotation: s.rotation,
    scale: s.scale,
  }));

  return {
    wardrobe: {
      id: wardrobe.id,
      title: wardrobe.title,
      tagline: wardrobe.tagline,
      icon: wardrobe.icon,
      theme: {
        ground: wardrobe.ground as Ground,
        pattern: wardrobe.pattern as Pattern,
        accent: wardrobe.accent as Accent,
      },
      layoutMode: wardrobe.layoutMode as LayoutMode,
      sortKey: wardrobe.sortKey as SortKey,
      handle: wardrobe.owner.handle,
      visibility: wardrobe.visibility,
      shareCode: wardrobe.shareCode,
      shareDetails: wardrobe.shareDetails,
    },
    sections,
    items: wardrobe.items.map(toItem),
    stickers,
    wardrobes: await listWardrobes(userId),
    storageBase: publicBase() || null,
  };
}

// Starter sections for a brand-new wardrobe, by template.
export const TEMPLATES: Record<string, { title: string; icon: string; tagline: string; sections: [string, string][] }> = {
  closet: {
    title: "my wardrobe",
    icon: "✦",
    tagline: "everything, arranged just so.",
    sections: [["tops", "cobalt"], ["bottoms", "olive"], ["shoes", "terracotta"], ["bags", "honey"]],
  },
  wishlist: {
    title: "wishlist",
    icon: "♡",
    tagline: "things i'm keeping an eye on.",
    sections: [["soon", "blush"], ["someday", "honey"]],
  },
  gear: {
    title: "gear",
    icon: "⚙",
    tagline: "the kit.",
    sections: [["tech", "cobalt"], ["outdoor", "olive"], ["tools", "brass"]],
  },
  blank: { title: "new wardrobe", icon: "○", tagline: "", sections: [] },
};

export function wardrobeCreateData(template: keyof typeof TEMPLATES, opts: { title?: string; ground?: string; order?: number } = {}) {
  const t = TEMPLATES[template] ?? TEMPLATES.blank;
  return {
    title: opts.title?.trim() || t.title,
    tagline: t.tagline || null,
    icon: t.icon,
    ground: opts.ground ?? "daylight",
    order: opts.order ?? 0,
    sections: {
      create: t.sections.map(([name, color], order) => ({ name, color, icon: "✦", order })),
    },
  };
}

// Rewrites an image URL for the browser: our own bucket and data: URLs are
// used as-is; anything else goes through the same-origin proxy.
export function isOwnImage(url: string) {
  const base = publicBase();
  return (!!base && url.startsWith(base + "/")) || url.startsWith("data:") || url.startsWith("/");
}

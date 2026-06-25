import "server-only";
import { prisma } from "@/lib/db";
import type {
  WardrobePayload,
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

// Loads the current user's single wardrobe (one per person at launch, brief §25).
export async function loadWardrobe(userId: string): Promise<WardrobePayload | null> {
  const wardrobe = await prisma.wardrobe.findFirst({
    where: { ownerId: userId },
    include: {
      sections: { orderBy: { order: "asc" } },
      items: true,
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

  const items: Item[] = wardrobe.items.map((i) => ({
    id: i.id,
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
    createdAt: i.createdAt.toISOString(),
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
    items,
    stickers,
  };
}

// Verify a wardrobe belongs to the user (ownership guard for mutations).
export async function assertOwnsWardrobe(userId: string, wardrobeId: string) {
  const w = await prisma.wardrobe.findFirst({
    where: { id: wardrobeId, ownerId: userId },
    select: { id: true },
  });
  return !!w;
}

export async function getUserWardrobeId(userId: string): Promise<string | null> {
  const w = await prisma.wardrobe.findFirst({
    where: { ownerId: userId },
    select: { id: true },
  });
  return w?.id ?? null;
}

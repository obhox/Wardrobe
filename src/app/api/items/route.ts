import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { wardrobeScope } from "@/lib/server/scope";
import { itemFields, imageRef, optionalImageRef, sourceUrl } from "@/lib/server/schemas";
import { persistImage } from "@/lib/server/item-images";
import { hit, LIMITS } from "@/lib/auth/rate-limit";
import { error, json, notFound, readJson, tooMany, unauthorized } from "@/lib/server/http";
import { toItem } from "@/lib/wardrobe";

export const dynamic = "force-dynamic";

const MAX_ITEMS_PER_WARDROBE = 2000;

const create = z.object({
  imageUrl: imageRef,
  cutoutUrl: optionalImageRef,
  sourceUrl,
  ...itemFields,
  status: itemFields.status.default("owned"),
  sizeTier: itemFields.sizeTier.default("medium"),
  hue: itemFields.hue.default(-1),
  posX: itemFields.posX.default(0.5),
  posY: itemFields.posY.default(0.4),
  rotation: itemFields.rotation.default(0),
  priceAlert: itemFields.priceAlert.default(true),
  sourceType: z.enum(["manual", "scraped"]).default("manual"),
});

// "is this link already in my wardrobe?" — the browser extension asks before
// adding, so saving the same product twice is a choice, not an accident
export async function GET(req: NextRequest) {
  const { user, wardrobeId } = await wardrobeScope(req);
  if (!user) return unauthorized();
  if (!wardrobeId) return notFound();

  const src = req.nextUrl.searchParams.get("sourceUrl")?.trim();
  if (!src) return error("missing sourceUrl", 400);

  const items = await prisma.item.findMany({
    where: { wardrobe: { ownerId: user.id }, sourceUrl: src },
    select: { id: true, name: true, status: true, wardrobeId: true },
    orderBy: { createdAt: "desc" },
    take: 5,
  });
  return json({ items });
}

export async function POST(req: NextRequest) {
  const body = await readJson(req);
  const { user, wardrobeId } = await wardrobeScope(req, body);
  if (!user) return unauthorized();
  if (!wardrobeId) return notFound();

  const parsed = create.safeParse(body);
  if (!parsed.success) {
    return error("invalid input", 400, { detail: parsed.error.flatten().fieldErrors });
  }
  const rate = await hit(`items:${user.id}`, LIMITS.uploadPerUser);
  if (!rate.allowed) return tooMany(rate.retryAfterMs);
  if ((await prisma.item.count({ where: { wardrobeId } })) >= MAX_ITEMS_PER_WARDROBE) {
    return error("this wardrobe is full — start another one", 400);
  }

  const data = parsed.data;
  if (data.sectionId) {
    const sec = await prisma.section.findFirst({ where: { id: data.sectionId, wardrobeId }, select: { id: true } });
    if (!sec) data.sectionId = null;
  }

  // copy photos into our bucket (no hotlinking, no inline blobs)
  const imageUrl = (await persistImage(user.id, data.imageUrl, "original")) ?? data.imageUrl;
  const cutoutUrl =
    data.cutoutUrl && data.cutoutUrl !== data.imageUrl
      ? await persistImage(user.id, data.cutoutUrl, "cutout")
      : null;

  const trackedPrice = data.price ?? null;
  const item = await prisma.item.create({
    data: {
      ...data,
      imageUrl,
      cutoutUrl,
      wardrobeId,
      lowestPrice: trackedPrice,
      ...(trackedPrice != null && data.sourceUrl
        ? { prices: { create: { price: trackedPrice, currency: data.currency ?? "USD" } } }
        : {}),
    },
  });
  return json(toItem(item));
}

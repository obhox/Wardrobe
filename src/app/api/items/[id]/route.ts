import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/session";
import { itemFields, optionalImageRef, sourceUrl } from "@/lib/server/schemas";
import { persistImage } from "@/lib/server/item-images";
import { deleteUrls } from "@/lib/server/storage";
import { switchCurrency } from "@/lib/server/money";
import { error, json, notFound, readJson, unauthorized } from "@/lib/server/http";
import { toItem } from "@/lib/wardrobe";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

const patch = z
  .object({
    ...itemFields,
    imageUrl: optionalImageRef,
    cutoutUrl: optionalImageRef,
    sourceUrl,
    // move to another of the user's wardrobes
    wardrobeId: z.string().optional(),
    // changing currency converts the amounts; relabel keeps the digits
    relabelCurrency: z.boolean().optional(),
  })
  .partial();

async function ownedItem(userId: string, id: string) {
  return prisma.item.findFirst({ where: { id, wardrobe: { ownerId: userId } } });
}

export async function GET(_req: NextRequest, { params }: Ctx) {
  const user = await getCurrentUser();
  if (!user) return unauthorized();
  const { id } = await params;
  const item = await ownedItem(user.id, id);
  return item ? json(toItem(item)) : notFound();
}

export async function PATCH(req: NextRequest, { params }: Ctx) {
  const user = await getCurrentUser();
  if (!user) return unauthorized();
  const { id } = await params;
  const item = await ownedItem(user.id, id);
  if (!item) return notFound();

  const parsed = patch.safeParse(await readJson(req));
  if (!parsed.success) {
    return error("That doesn't look right. Check it and try again.", 400, { detail: parsed.error.flatten().fieldErrors });
  }
  const data: Record<string, unknown> = { ...parsed.data };
  delete data.relabelCurrency;
  if (data.imageUrl === null) delete data.imageUrl; // an item always has a photo

  // a currency change moves the amounts (and the price history) with it
  let money = null as Awaited<ReturnType<typeof switchCurrency>> | null;
  if (typeof parsed.data.currency === "string") {
    money = await switchCurrency(item, parsed.data.currency, { relabel: parsed.data.relabelCurrency });
    if (money.changed) Object.assign(data, money.data);
  }

  let targetWardrobe = item.wardrobeId;
  if (parsed.data.wardrobeId && parsed.data.wardrobeId !== item.wardrobeId) {
    const w = await prisma.wardrobe.findFirst({
      where: { id: parsed.data.wardrobeId, ownerId: user.id },
      select: { id: true },
    });
    if (!w) return notFound();
    targetWardrobe = w.id;
    if (parsed.data.sectionId === undefined) data.sectionId = null; // sections don't travel
  } else {
    delete data.wardrobeId;
  }

  if (parsed.data.sectionId) {
    const sec = await prisma.section.findFirst({
      where: { id: parsed.data.sectionId, wardrobeId: targetWardrobe },
      select: { id: true },
    });
    if (!sec) data.sectionId = null;
  }

  const stale: (string | null)[] = [];
  if (typeof parsed.data.imageUrl === "string" && parsed.data.imageUrl !== item.imageUrl) {
    data.imageUrl = await persistImage(user.id, parsed.data.imageUrl, "original");
    stale.push(item.imageUrl);
  }
  if (parsed.data.cutoutUrl !== undefined && parsed.data.cutoutUrl !== item.cutoutUrl) {
    data.cutoutUrl = parsed.data.cutoutUrl
      ? await persistImage(user.id, parsed.data.cutoutUrl, "cutout")
      : null;
    if (item.cutoutUrl !== item.imageUrl) stale.push(item.cutoutUrl);
  }

  // a manual price edit on a tracked item is a data point too
  if (
    typeof parsed.data.price === "number" &&
    parsed.data.price !== item.price &&
    (parsed.data.sourceUrl ?? item.sourceUrl)
  ) {
    await prisma.priceSnapshot.create({
      data: { itemId: id, price: parsed.data.price, currency: parsed.data.currency ?? item.currency },
    });
    if (item.lowestPrice == null || parsed.data.price < item.lowestPrice) data.lowestPrice = parsed.data.price;
  }

  const updated = await prisma.item.update({ where: { id }, data });
  if (money?.applyHistory) await money.applyHistory();
  await deleteUrls(stale);
  return json({
    ...toItem(updated),
    ...(money?.changed ? { currencySwitch: { from: money.from, to: money.to, converted: money.converted } } : {}),
  });
}

export async function DELETE(_req: NextRequest, { params }: Ctx) {
  const user = await getCurrentUser();
  if (!user) return unauthorized();
  const { id } = await params;
  const item = await ownedItem(user.id, id);
  if (!item) return notFound();
  await prisma.item.delete({ where: { id } });
  await deleteUrls([item.imageUrl, item.cutoutUrl]);
  return json({ ok: true });
}

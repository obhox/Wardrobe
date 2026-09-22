import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/session";
import { hit } from "@/lib/auth/rate-limit";
import { checkItemPrice } from "@/lib/server/price-check";
import { error, json, notFound, tooMany, unauthorized } from "@/lib/server/http";
import { toItem } from "@/lib/wardrobe";

export const dynamic = "force-dynamic";

// POST → re-read this item's product page for its current price now
export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return unauthorized();
  const { id } = await params;
  const item = await prisma.item.findFirst({ where: { id, wardrobe: { ownerId: user.id } } });
  if (!item) return notFound();
  if (!item.sourceUrl) return error("this item has no product link to check", 400);

  const rate = await hit(`price-check:${user.id}`, { limit: 20, windowMs: 10 * 60 * 1000 });
  if (!rate.allowed) return tooMany(rate.retryAfterMs);

  const outcome = await checkItemPrice(item);
  const fresh = await prisma.item.findUniqueOrThrow({ where: { id } });
  return json({ found: outcome.price != null, item: toItem(fresh) });
}

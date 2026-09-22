import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/session";
import { json, notFound, unauthorized } from "@/lib/server/http";

export const dynamic = "force-dynamic";

// GET → an item's price history (oldest first)
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return unauthorized();
  const { id } = await params;
  const item = await prisma.item.findFirst({
    where: { id, wardrobe: { ownerId: user.id } },
    select: { id: true },
  });
  if (!item) return notFound();
  const points = await prisma.priceSnapshot.findMany({
    where: { itemId: id },
    orderBy: { checkedAt: "asc" },
    take: 365,
    select: { price: true, currency: true, checkedAt: true },
  });
  return json({ points });
}

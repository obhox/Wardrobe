import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/session";
import { getUserWardrobeId } from "@/lib/wardrobe";

export const dynamic = "force-dynamic";

// Batch position/rotation persistence (debounced from the canvas, brief §23).
const schema = z.object({
  positions: z
    .array(
      z.object({
        id: z.string(),
        posX: z.number(),
        posY: z.number(),
        rotation: z.number().optional(),
      })
    )
    .max(500),
});

export async function PATCH(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const wardrobeId = await getUserWardrobeId(user.id);
  if (!wardrobeId) return NextResponse.json({ error: "no wardrobe" }, { status: 404 });

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success)
    return NextResponse.json({ error: "invalid input" }, { status: 400 });

  // only update items that belong to this wardrobe
  const ids = parsed.data.positions.map((p) => p.id);
  const owned = await prisma.item.findMany({
    where: { id: { in: ids }, wardrobeId },
    select: { id: true },
  });
  const ownedSet = new Set(owned.map((o) => o.id));

  await prisma.$transaction(
    parsed.data.positions
      .filter((p) => ownedSet.has(p.id))
      .map((p) =>
        prisma.item.update({
          where: { id: p.id },
          data: {
            posX: p.posX,
            posY: p.posY,
            ...(p.rotation != null ? { rotation: p.rotation } : {}),
          },
        })
      )
  );

  return NextResponse.json({ ok: true, updated: ownedSet.size });
}

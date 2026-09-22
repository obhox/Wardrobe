import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/session";
import { fraction, rotation } from "@/lib/server/schemas";
import { error, json, readJson, unauthorized } from "@/lib/server/http";

export const dynamic = "force-dynamic";

// Batch position/rotation persistence (debounced from the canvas, brief §23).
// Clients send only what moved.
const schema = z.object({
  positions: z
    .array(
      z.object({
        id: z.string().max(40),
        posX: fraction,
        posY: fraction,
        rotation: rotation.optional(),
      })
    )
    .max(2000),
});

export async function PATCH(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return unauthorized();
  const parsed = schema.safeParse(await readJson(req));
  if (!parsed.success) return error("invalid input", 400);

  const results = await prisma.$transaction(
    parsed.data.positions.map((p) =>
      prisma.item.updateMany({
        where: { id: p.id, wardrobe: { ownerId: user.id } },
        data: {
          posX: p.posX,
          posY: p.posY,
          ...(p.rotation != null ? { rotation: p.rotation } : {}),
        },
      })
    )
  );
  return json({ ok: true, updated: results.reduce((n, r) => n + r.count, 0) });
}

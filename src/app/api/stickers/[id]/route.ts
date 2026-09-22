import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/session";
import { fraction, rotation } from "@/lib/server/schemas";
import { error, json, notFound, readJson, unauthorized } from "@/lib/server/http";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

const patch = z.object({
  posX: fraction.optional(),
  posY: fraction.optional(),
  rotation: rotation.optional(),
  scale: z.number().min(0.3).max(4).optional(),
});

export async function PATCH(req: NextRequest, { params }: Ctx) {
  const user = await getCurrentUser();
  if (!user) return unauthorized();
  const { id } = await params;
  const parsed = patch.safeParse(await readJson(req));
  if (!parsed.success) return error("invalid input", 400);
  const { count } = await prisma.sticker.updateMany({
    where: { id, wardrobe: { ownerId: user.id } },
    data: parsed.data,
  });
  return count ? json({ ok: true }) : notFound();
}

export async function DELETE(_req: NextRequest, { params }: Ctx) {
  const user = await getCurrentUser();
  if (!user) return unauthorized();
  const { id } = await params;
  const { count } = await prisma.sticker.deleteMany({ where: { id, wardrobe: { ownerId: user.id } } });
  return count ? json({ ok: true }) : notFound();
}

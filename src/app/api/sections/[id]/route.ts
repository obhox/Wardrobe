import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/session";
import { error, json, notFound, readJson, unauthorized } from "@/lib/server/http";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

const patch = z.object({
  name: z.string().trim().min(1).max(40).optional(),
  icon: z.string().max(4).nullable().optional(),
  color: z.string().max(20).nullable().optional(),
  order: z.number().int().min(0).max(10_000).optional(),
  shared: z.boolean().optional(),
});

export async function PATCH(req: NextRequest, { params }: Ctx) {
  const user = await getCurrentUser();
  if (!user) return unauthorized();
  const { id } = await params;
  const parsed = patch.safeParse(await readJson(req));
  if (!parsed.success) return error("invalid input", 400);

  const { count } = await prisma.section.updateMany({
    where: { id, wardrobe: { ownerId: user.id } },
    data: parsed.data,
  });
  return count ? json({ ok: true }) : notFound();
}

export async function DELETE(_req: NextRequest, { params }: Ctx) {
  const user = await getCurrentUser();
  if (!user) return unauthorized();
  const { id } = await params;
  // items in this section fall back to unsorted (onDelete: SetNull)
  const { count } = await prisma.section.deleteMany({ where: { id, wardrobe: { ownerId: user.id } } });
  return count ? json({ ok: true }) : notFound();
}

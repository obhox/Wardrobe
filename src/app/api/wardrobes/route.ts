import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/session";
import { listWardrobes, TEMPLATES, wardrobeCreateData } from "@/lib/wardrobe";
import { error, json, readJson, unauthorized } from "@/lib/server/http";

export const dynamic = "force-dynamic";

const MAX_WARDROBES = 20;

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return unauthorized();
  return json({ wardrobes: await listWardrobes(user.id), lastWardrobeId: user.lastWardrobeId });
}

const create = z.object({
  title: z.string().trim().max(60).optional(),
  template: z.enum(Object.keys(TEMPLATES) as [string, ...string[]]).default("blank"),
});

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return unauthorized();
  const parsed = create.safeParse(await readJson(req));
  if (!parsed.success) return error("invalid input", 400);

  const existing = await prisma.wardrobe.aggregate({
    where: { ownerId: user.id },
    _count: true,
    _max: { order: true },
  });
  if (existing._count >= MAX_WARDROBES) return error(`you can keep up to ${MAX_WARDROBES} wardrobes`, 400);

  const w = await prisma.wardrobe.create({
    data: {
      ownerId: user.id,
      ...wardrobeCreateData(parsed.data.template as keyof typeof TEMPLATES, {
        title: parsed.data.title,
        ground: user.defaultTheme,
        order: (existing._max.order ?? 0) + 1,
      }),
    },
  });
  await prisma.user.update({ where: { id: user.id }, data: { lastWardrobeId: w.id } });
  return json({ id: w.id });
}

// PATCH { order: [id, id, …] } → reorder the switcher
const reorder = z.object({ order: z.array(z.string()).max(MAX_WARDROBES) });

export async function PATCH(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return unauthorized();
  const parsed = reorder.safeParse(await readJson(req));
  if (!parsed.success) return error("invalid input", 400);
  await prisma.$transaction(
    parsed.data.order.map((id, order) =>
      prisma.wardrobe.updateMany({ where: { id, ownerId: user.id }, data: { order } })
    )
  );
  return json({ ok: true });
}

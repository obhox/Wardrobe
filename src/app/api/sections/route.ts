import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { wardrobeScope } from "@/lib/server/scope";
import { error, json, notFound, readJson, unauthorized } from "@/lib/server/http";

export const dynamic = "force-dynamic";

// lightweight section list — used by the browser extension's section picker
export async function GET(req: NextRequest) {
  const { user, wardrobeId } = await wardrobeScope(req);
  if (!user) return unauthorized();
  if (!wardrobeId) return notFound();
  const sections = await prisma.section.findMany({
    where: { wardrobeId },
    orderBy: { order: "asc" },
    select: { id: true, name: true, icon: true },
  });
  return json({ sections, wardrobeId });
}

const create = z.object({
  name: z.string().trim().min(1).max(40),
  icon: z.string().max(4).nullable().optional(),
  color: z.string().max(20).nullable().optional(),
});

export async function POST(req: NextRequest) {
  const body = await readJson(req);
  const { user, wardrobeId } = await wardrobeScope(req, body);
  if (!user) return unauthorized();
  if (!wardrobeId) return notFound();

  const parsed = create.safeParse(body);
  if (!parsed.success) return error("invalid input", 400);

  const agg = await prisma.section.aggregate({ where: { wardrobeId }, _max: { order: true }, _count: true });
  if (agg._count >= 60) return error("that's a lot of sections — tidy a few first", 400);
  const section = await prisma.section.create({
    data: { ...parsed.data, wardrobeId, order: (agg._max.order ?? -1) + 1 },
  });
  return json({ ...section, count: 0 });
}

// PATCH { order: [id, …] } → reorder sections
const reorder = z.object({ wardrobeId: z.string().optional(), order: z.array(z.string()).max(60) });

export async function PATCH(req: NextRequest) {
  const body = await readJson(req);
  const { user, wardrobeId } = await wardrobeScope(req, body);
  if (!user) return unauthorized();
  if (!wardrobeId) return notFound();
  const parsed = reorder.safeParse(body);
  if (!parsed.success) return error("invalid input", 400);
  await prisma.$transaction(
    parsed.data.order.map((id, order) =>
      prisma.section.updateMany({ where: { id, wardrobeId }, data: { order } })
    )
  );
  return json({ ok: true });
}

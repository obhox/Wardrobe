import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/session";
import { loadWardrobe } from "@/lib/wardrobe";
import { deleteUrls } from "@/lib/server/storage";
import {
  accentSchema,
  groundSchema,
  layoutSchema,
  patternSchema,
  sortSchema,
} from "@/lib/server/schemas";
import { error, json, notFound, readJson, unauthorized } from "@/lib/server/http";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

// GET → the full payload for one wardrobe (also marks it last-opened)
export async function GET(_req: NextRequest, { params }: Ctx) {
  const user = await getCurrentUser();
  if (!user) return unauthorized();
  const { id } = await params;
  const payload = await loadWardrobe(user.id, id);
  if (!payload) return notFound();
  if (user.lastWardrobeId !== id) {
    await prisma.user.update({ where: { id: user.id }, data: { lastWardrobeId: id } });
  }
  return json(payload);
}

const patch = z.object({
  title: z.string().trim().min(1).max(60).optional(),
  tagline: z.string().max(120).nullable().optional(),
  icon: z.string().max(4).nullable().optional(),
  ground: groundSchema.optional(),
  pattern: patternSchema.optional(),
  accent: accentSchema.optional(),
  layoutMode: layoutSchema.optional(),
  sortKey: sortSchema.optional(),
});

export async function PATCH(req: NextRequest, { params }: Ctx) {
  const user = await getCurrentUser();
  if (!user) return unauthorized();
  const { id } = await params;
  const parsed = patch.safeParse(await readJson(req));
  if (!parsed.success) return error("invalid input", 400);
  const { count } = await prisma.wardrobe.updateMany({
    where: { id, ownerId: user.id },
    data: parsed.data,
  });
  return count ? json({ ok: true }) : notFound();
}

// DELETE { confirm: "<title>" } → remove a wardrobe (never the last one)
export async function DELETE(req: NextRequest, { params }: Ctx) {
  const user = await getCurrentUser();
  if (!user) return unauthorized();
  const { id } = await params;
  const body = (await readJson(req)) as { confirm?: string } | null;

  const w = await prisma.wardrobe.findFirst({
    where: { id, ownerId: user.id },
    select: { id: true, title: true, items: { select: { imageUrl: true, cutoutUrl: true } } },
  });
  if (!w) return notFound();
  if ((body?.confirm ?? "").trim().toLowerCase() !== w.title.trim().toLowerCase()) {
    return error("type the wardrobe's name to confirm", 400);
  }
  const count = await prisma.wardrobe.count({ where: { ownerId: user.id } });
  if (count <= 1) return error("that's your only wardrobe — make another first", 400);

  await prisma.wardrobe.delete({ where: { id } });
  await deleteUrls(w.items.flatMap((i) => [i.imageUrl, i.cutoutUrl]));
  if (user.lastWardrobeId === id) {
    await prisma.user.update({ where: { id: user.id }, data: { lastWardrobeId: null } });
  }
  return json({ ok: true });
}

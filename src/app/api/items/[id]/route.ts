import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/session";
import { getUserWardrobeId } from "@/lib/wardrobe";

export const dynamic = "force-dynamic";

const patch = z.object({
  name: z.string().min(1).max(120).optional(),
  brand: z.string().max(80).nullable().optional(),
  price: z.number().nonnegative().nullable().optional(),
  currency: z.string().max(8).nullable().optional(),
  status: z.enum(["owned", "want"]).optional(),
  boughtAt: z.string().max(120).nullable().optional(),
  notes: z.string().max(2000).nullable().optional(),
  targetPrice: z.number().nonnegative().nullable().optional(),
  priority: z.number().int().nullable().optional(),
  sectionId: z.string().nullable().optional(),
  sizeTier: z.enum(["hero", "large", "medium", "small"]).optional(),
  hue: z.number().int().min(0).max(360).optional(),
  posX: z.number().optional(),
  posY: z.number().optional(),
  rotation: z.number().optional(),
  cutoutUrl: z.string().url().nullable().optional(),
});

async function guard(userId: string, itemId: string) {
  const wardrobeId = await getUserWardrobeId(userId);
  if (!wardrobeId) return null;
  const item = await prisma.item.findFirst({
    where: { id: itemId, wardrobeId },
    select: { id: true },
  });
  return item ? wardrobeId : null;
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { id } = await params;
  const wardrobeId = await guard(user.id, id);
  if (!wardrobeId) return NextResponse.json({ error: "not found" }, { status: 404 });

  const body = await req.json().catch(() => null);
  const parsed = patch.safeParse(body);
  if (!parsed.success)
    return NextResponse.json({ error: "invalid input" }, { status: 400 });

  if (parsed.data.sectionId) {
    const sec = await prisma.section.findFirst({
      where: { id: parsed.data.sectionId, wardrobeId },
      select: { id: true },
    });
    if (!sec) parsed.data.sectionId = null;
  }

  const item = await prisma.item.update({ where: { id }, data: parsed.data });
  return NextResponse.json(item);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { id } = await params;
  const wardrobeId = await guard(user.id, id);
  if (!wardrobeId) return NextResponse.json({ error: "not found" }, { status: 404 });

  await prisma.item.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}

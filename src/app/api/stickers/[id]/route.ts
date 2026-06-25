import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/session";
import { getUserWardrobeId } from "@/lib/wardrobe";

export const dynamic = "force-dynamic";

const patch = z.object({
  posX: z.number().optional(),
  posY: z.number().optional(),
  rotation: z.number().optional(),
  scale: z.number().optional(),
});

async function guard(userId: string, stickerId: string) {
  const wardrobeId = await getUserWardrobeId(userId);
  if (!wardrobeId) return null;
  const s = await prisma.sticker.findFirst({
    where: { id: stickerId, wardrobeId },
    select: { id: true },
  });
  return s ? wardrobeId : null;
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { id } = await params;
  if (!(await guard(user.id, id)))
    return NextResponse.json({ error: "not found" }, { status: 404 });

  const body = await req.json().catch(() => null);
  const parsed = patch.safeParse(body);
  if (!parsed.success)
    return NextResponse.json({ error: "invalid input" }, { status: 400 });

  const sticker = await prisma.sticker.update({ where: { id }, data: parsed.data });
  return NextResponse.json(sticker);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { id } = await params;
  if (!(await guard(user.id, id)))
    return NextResponse.json({ error: "not found" }, { status: 404 });

  await prisma.sticker.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}

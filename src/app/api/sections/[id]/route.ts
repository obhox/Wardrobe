import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/session";
import { getUserWardrobeId } from "@/lib/wardrobe";

export const dynamic = "force-dynamic";

const patch = z.object({
  name: z.string().min(1).max(40).optional(),
  icon: z.string().max(4).nullable().optional(),
  color: z.string().max(20).nullable().optional(),
  order: z.number().int().optional(),
  shared: z.boolean().optional(),
});

async function guard(userId: string, sectionId: string) {
  const wardrobeId = await getUserWardrobeId(userId);
  if (!wardrobeId) return null;
  const sec = await prisma.section.findFirst({
    where: { id: sectionId, wardrobeId },
    select: { id: true },
  });
  return sec ? wardrobeId : null;
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

  const section = await prisma.section.update({ where: { id }, data: parsed.data });
  return NextResponse.json(section);
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

  // items in this section fall back to Unsorted (onDelete: SetNull)
  await prisma.section.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}

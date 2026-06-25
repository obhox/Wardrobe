import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/session";
import { getUserWardrobeId } from "@/lib/wardrobe";

export const dynamic = "force-dynamic";

const create = z.object({
  name: z.string().min(1).max(40),
  icon: z.string().max(4).nullable().optional(),
  color: z.string().max(20).nullable().optional(),
});

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const wardrobeId = await getUserWardrobeId(user.id);
  if (!wardrobeId) return NextResponse.json({ error: "no wardrobe" }, { status: 404 });

  const body = await req.json().catch(() => null);
  const parsed = create.safeParse(body);
  if (!parsed.success)
    return NextResponse.json({ error: "invalid input" }, { status: 400 });

  const count = await prisma.section.count({ where: { wardrobeId } });
  const section = await prisma.section.create({
    data: { ...parsed.data, wardrobeId, order: count },
  });
  return NextResponse.json(section);
}

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/session";
import { getUserWardrobeId } from "@/lib/wardrobe";

export const dynamic = "force-dynamic";

const create = z.object({
  kind: z.enum(["star", "cat", "scribble", "washi", "shrug"]),
  posX: z.number().default(0.5),
  posY: z.number().default(0.5),
  rotation: z.number().default(0),
  scale: z.number().default(1),
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

  const sticker = await prisma.sticker.create({
    data: { ...parsed.data, wardrobeId },
  });
  return NextResponse.json(sticker);
}

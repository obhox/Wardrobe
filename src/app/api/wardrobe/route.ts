import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/session";
import { loadWardrobe, getUserWardrobeId } from "@/lib/wardrobe";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const payload = await loadWardrobe(user.id);
  if (!payload) return NextResponse.json({ error: "no wardrobe" }, { status: 404 });
  return NextResponse.json(payload);
}

const patch = z.object({
  title: z.string().max(60).optional(),
  tagline: z.string().max(120).nullable().optional(),
  ground: z.string().optional(),
  pattern: z.string().optional(),
  accent: z.string().optional(),
  layoutMode: z.enum(["free", "grid", "shelves", "columns", "gallery"]).optional(),
  sortKey: z.enum(["recent", "color", "section", "status", "az"]).optional(),
});

export async function PATCH(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const wardrobeId = await getUserWardrobeId(user.id);
  if (!wardrobeId) return NextResponse.json({ error: "no wardrobe" }, { status: 404 });

  const body = await req.json().catch(() => null);
  const parsed = patch.safeParse(body);
  if (!parsed.success)
    return NextResponse.json({ error: "invalid input" }, { status: 400 });

  await prisma.wardrobe.update({ where: { id: wardrobeId }, data: parsed.data });
  return NextResponse.json({ ok: true });
}

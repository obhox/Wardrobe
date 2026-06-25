import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/session";
import { getUserWardrobeId } from "@/lib/wardrobe";

export const dynamic = "force-dynamic";

const create = z.object({
  imageUrl: z.string().url(),
  cutoutUrl: z.string().url().nullable().optional(),
  sourceUrl: z.string().url().nullable().optional(),
  name: z.string().min(1).max(120),
  brand: z.string().max(80).nullable().optional(),
  price: z.number().nonnegative().nullable().optional(),
  currency: z.string().max(8).nullable().optional(),
  status: z.enum(["owned", "want"]).default("owned"),
  boughtAt: z.string().max(120).nullable().optional(),
  notes: z.string().max(2000).nullable().optional(),
  targetPrice: z.number().nonnegative().nullable().optional(),
  sectionId: z.string().nullable().optional(),
  sizeTier: z.enum(["hero", "large", "medium", "small"]).default("medium"),
  hue: z.number().int().min(0).max(360).default(0),
  posX: z.number().default(0.5),
  posY: z.number().default(0.4),
  rotation: z.number().default(0),
  sourceType: z.enum(["manual", "scraped"]).default("manual"),
});

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const wardrobeId = await getUserWardrobeId(user.id);
  if (!wardrobeId) return NextResponse.json({ error: "no wardrobe" }, { status: 404 });

  const body = await req.json().catch(() => null);
  const parsed = create.safeParse(body);
  if (!parsed.success)
    return NextResponse.json(
      { error: "invalid input", detail: parsed.error.flatten() },
      { status: 400 }
    );

  // validate section ownership if provided
  if (parsed.data.sectionId) {
    const sec = await prisma.section.findFirst({
      where: { id: parsed.data.sectionId, wardrobeId },
      select: { id: true },
    });
    if (!sec) parsed.data.sectionId = null;
  }

  const item = await prisma.item.create({
    data: { ...parsed.data, wardrobeId },
  });
  return NextResponse.json(item);
}

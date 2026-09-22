import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { wardrobeScope } from "@/lib/server/scope";
import { fraction, rotation, stickerKindSchema } from "@/lib/server/schemas";
import { error, json, notFound, readJson, unauthorized } from "@/lib/server/http";

export const dynamic = "force-dynamic";

const create = z.object({
  kind: stickerKindSchema,
  posX: fraction.default(0.5),
  posY: fraction.default(0.5),
  rotation: rotation.default(0),
  scale: z.number().min(0.3).max(4).default(1),
});

export async function POST(req: NextRequest) {
  const body = await readJson(req);
  const { user, wardrobeId } = await wardrobeScope(req, body);
  if (!user) return unauthorized();
  if (!wardrobeId) return notFound();

  const parsed = create.safeParse(body);
  if (!parsed.success) return error("invalid input", 400);
  if ((await prisma.sticker.count({ where: { wardrobeId } })) >= 100) {
    return error("that's plenty of stickers", 400);
  }
  const sticker = await prisma.sticker.create({ data: { ...parsed.data, wardrobeId } });
  return json(sticker);
}

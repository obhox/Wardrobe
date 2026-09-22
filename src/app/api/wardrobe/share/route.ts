import { NextRequest } from "next/server";
import { randomBytes } from "crypto";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { wardrobeScope } from "@/lib/server/scope";
import { error, json, notFound, readJson, unauthorized } from "@/lib/server/http";

export const dynamic = "force-dynamic";

const schema = z
  .object({
    wardrobeId: z.string().optional(),
    enabled: z.boolean().optional(),
    details: z.boolean().optional(),
    rotate: z.boolean().optional(), // issue a new link; the old one stops working
  })
  .refine((b) => b.enabled !== undefined || b.details !== undefined || b.rotate, {
    message: "nothing to update",
  });

function makeShareCode() {
  return randomBytes(12).toString("base64url");
}

// Toggle read-only "unlisted" sharing for one wardrobe.
export async function POST(req: NextRequest) {
  const body = await readJson(req);
  const { user, wardrobeId } = await wardrobeScope(req, body);
  if (!user) return unauthorized();
  if (!wardrobeId) return notFound();

  const parsed = schema.safeParse(body);
  if (!parsed.success) return error("invalid input", 400);
  const { enabled, details, rotate } = parsed.data;

  const current = await prisma.wardrobe.findUnique({
    where: { id: wardrobeId },
    select: { shareCode: true },
  });
  const shareCode =
    rotate || (!current?.shareCode && enabled) ? makeShareCode() : current?.shareCode ?? null;

  const updated = await prisma.wardrobe.update({
    where: { id: wardrobeId },
    data: {
      ...(enabled !== undefined ? { visibility: enabled ? "unlisted" : "private" } : {}),
      shareCode,
      ...(details !== undefined ? { shareDetails: details } : {}),
    },
    select: { visibility: true, shareCode: true, shareDetails: true },
  });
  return json(updated);
}

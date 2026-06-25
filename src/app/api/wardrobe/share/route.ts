import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/session";
import { getUserWardrobeId } from "@/lib/wardrobe";

export const dynamic = "force-dynamic";

const body = z
  .object({ enabled: z.boolean().optional(), details: z.boolean().optional() })
  .refine((b) => b.enabled !== undefined || b.details !== undefined, {
    message: "nothing to update",
  });

// url-safe, unguessable share code (~16 chars)
function makeShareCode() {
  return randomBytes(12).toString("base64url");
}

// Toggle read-only "unlisted" sharing for the owner's wardrobe.
// Enabling mints a stable shareCode (reused on subsequent enables);
// disabling flips visibility back to private but keeps the code so the
// same link works again if the owner re-enables sharing.
export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const wardrobeId = await getUserWardrobeId(user.id);
  if (!wardrobeId) return NextResponse.json({ error: "no wardrobe" }, { status: 404 });

  const parsed = body.safeParse(await req.json().catch(() => null));
  if (!parsed.success)
    return NextResponse.json({ error: "invalid input" }, { status: 400 });

  const { enabled, details } = parsed.data;

  const current = await prisma.wardrobe.findUnique({
    where: { id: wardrobeId },
    select: { shareCode: true },
  });

  // mint a code the first time sharing is turned on; keep it thereafter
  const shareCode = current?.shareCode ?? (enabled ? makeShareCode() : null);

  const updated = await prisma.wardrobe.update({
    where: { id: wardrobeId },
    data: {
      ...(enabled !== undefined
        ? { visibility: enabled ? "unlisted" : "private" }
        : {}),
      ...(enabled && shareCode ? { shareCode } : {}),
      ...(details !== undefined ? { shareDetails: details } : {}),
    },
    select: { visibility: true, shareCode: true, shareDetails: true },
  });

  return NextResponse.json(updated);
}

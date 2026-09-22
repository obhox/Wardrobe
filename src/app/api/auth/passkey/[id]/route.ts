import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/session";
import { error, json, notFound, unauthorized } from "@/lib/server/http";

export const dynamic = "force-dynamic";

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return unauthorized();
  const { id } = await params;

  // never remove the last way in
  const others = await prisma.passkey.count({ where: { userId: user.id, NOT: { id } } });
  if (!user.hasCombination && !user.email && others === 0) {
    return error("this is your only way in — add an email or combination first", 400);
  }
  const { count } = await prisma.passkey.deleteMany({ where: { id, userId: user.id } });
  return count ? json({ ok: true }) : notFound();
}

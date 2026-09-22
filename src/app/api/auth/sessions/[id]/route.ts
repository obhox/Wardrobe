import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/session";
import { json, notFound, unauthorized } from "@/lib/server/http";

export const dynamic = "force-dynamic";

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return unauthorized();
  const { id } = await params;
  const { count } = await prisma.session.deleteMany({ where: { id, userId: user.id } });
  return count ? json({ ok: true }) : notFound();
}

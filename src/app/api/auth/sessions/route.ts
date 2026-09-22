import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/session";
import { json, unauthorized } from "@/lib/server/http";

export const dynamic = "force-dynamic";

// GET → devices signed in to this account; DELETE → sign out every other one
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return unauthorized();
  const sessions = await prisma.session.findMany({
    where: { userId: user.id, expiresAt: { gt: new Date() } },
    orderBy: { lastSeenAt: "desc" },
    select: { id: true, userAgent: true, createdAt: true, lastSeenAt: true },
  });
  return json({
    sessions: sessions.map((s) => ({ ...s, current: s.id === user.sessionId })),
  });
}

export async function DELETE() {
  const user = await getCurrentUser();
  if (!user) return unauthorized();
  const { count } = await prisma.session.deleteMany({
    where: { userId: user.id, NOT: { id: user.sessionId } },
  });
  return json({ ok: true, removed: count });
}

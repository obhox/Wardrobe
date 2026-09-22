import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/session";
import { json, unauthorized } from "@/lib/server/http";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return unauthorized();
  const [notifications, unread] = await Promise.all([
    prisma.notification.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 30,
      select: { id: true, kind: true, itemId: true, body: true, readAt: true, createdAt: true },
    }),
    prisma.notification.count({ where: { userId: user.id, readAt: null } }),
  ]);
  return json({ notifications, unread });
}

// PATCH → mark everything read
export async function PATCH() {
  const user = await getCurrentUser();
  if (!user) return unauthorized();
  await prisma.notification.updateMany({
    where: { userId: user.id, readAt: null },
    data: { readAt: new Date() },
  });
  return json({ ok: true });
}

import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/session";
import { json, unauthorized } from "@/lib/server/http";

export const dynamic = "force-dynamic";

// the signed-in user's passkeys
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return unauthorized();
  const passkeys = await prisma.passkey.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "asc" },
    select: { id: true, deviceLabel: true, createdAt: true },
  });
  return json({ passkeys });
}

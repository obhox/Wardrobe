import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/session";
import { error, json, unauthorized } from "@/lib/server/http";

export const dynamic = "force-dynamic";

// DELETE → detach the email (only when there's another way in)
export async function DELETE() {
  const me = await getCurrentUser();
  if (!me) return unauthorized();
  const passkeys = await prisma.passkey.count({ where: { userId: me.id } });
  if (!me.hasCombination && passkeys === 0) {
    return error("add a combination or a passkey first — otherwise you'd be locked out", 400);
  }
  await prisma.user.update({ where: { id: me.id }, data: { recoveryEmail: null } });
  return json({ email: null });
}

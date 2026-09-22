import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/session";
import { error, json, readJson, unauthorized } from "@/lib/server/http";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return json({ user: null });
  const passkeys = await prisma.passkey.count({ where: { userId: user.id } });
  const { sessionId: _s, ...rest } = user;
  void _s;
  return json({ user: { ...rest, passkeys } });
}

const patch = z.object({
  displayName: z.string().trim().max(40).nullable().optional(),
  displayCurrency: z.string().regex(/^[A-Z]{3}$/).optional(),
});

export async function PATCH(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return unauthorized();
  const parsed = patch.safeParse(await readJson(req));
  if (!parsed.success) return error("invalid input", 400);
  await prisma.user.update({ where: { id: user.id }, data: parsed.data });
  return json({ ok: true });
}

import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { combinationStrengthOk, normalizeCombination } from "@/lib/auth/combination";
import { hashSecret, lookupHash, verifySecret } from "@/lib/auth/crypto";
import { getCurrentUser } from "@/lib/auth/session";
import { clear, fail, failed } from "@/lib/auth/rate-limit";
import { error, json, readJson, tooMany, unauthorized } from "@/lib/server/http";

export const dynamic = "force-dynamic";

// Set or change the combination while signed in. Changing one needs the
// current combination; email/passkey-only accounts can set a first one.
const schema = z.object({
  current: z.string().max(200).optional(),
  newPhrase: z.string().min(3).max(200),
});

export async function POST(req: NextRequest) {
  const me = await getCurrentUser();
  if (!me) return unauthorized();
  const parsed = schema.safeParse(await readJson(req));
  if (!parsed.success) return error("invalid input", 400);

  const key = `combo-change:${me.id}`;
  const backoff = await failed(key);
  if (!backoff.allowed) return tooMany(backoff.retryAfterMs);

  const user = await prisma.user.findUniqueOrThrow({ where: { id: me.id } });
  if (user.combinationHash) {
    const ok = await verifySecret(user.combinationHash, normalizeCombination(parsed.data.current ?? ""));
    if (!ok) {
      await fail(key);
      return error("your current combination didn't match", 401);
    }
  }
  if (!combinationStrengthOk(parsed.data.newPhrase)) {
    return error("combination too weak — need 4 words and a number", 400);
  }
  const normalized = normalizeCombination(parsed.data.newPhrase);
  await prisma.user.update({
    where: { id: me.id },
    data: {
      combinationHash: await hashSecret(normalized),
      lookupHash: lookupHash(`${user.handle}:${normalized}`),
    },
  });
  await clear(key);
  // other devices were unlocked with the old combination — sign them out
  await prisma.session.deleteMany({ where: { userId: me.id, NOT: { id: me.sessionId } } });
  return json({ ok: true });
}

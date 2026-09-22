import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import {
  normalizeCombination,
  combinationStrengthOk,
  normalizeHandle,
} from "@/lib/auth/combination";
import { DUMMY_HASH, hashSecret, lookupHash, verifySecret } from "@/lib/auth/crypto";
import { createSession } from "@/lib/auth/session";
import { hit, LIMITS } from "@/lib/auth/rate-limit";
import { clientIp, error, json, readJson, tooMany } from "@/lib/server/http";

export const dynamic = "force-dynamic";

// Recovery: the emailed code + a new (generated) combination.
const schema = z.object({
  handle: z.string().min(1).max(40),
  emailCode: z.string().min(4).max(8),
  newPhrase: z.string().min(3).max(200),
});

const MAX_ATTEMPTS = 5;

export async function POST(req: NextRequest) {
  const parsed = schema.safeParse(await readJson(req));
  if (!parsed.success) return error("invalid input", 400);
  const handle = normalizeHandle(parsed.data.handle);

  const ipRate = await hit(`auth:ip:${clientIp(req)}`, LIMITS.authIp);
  if (!ipRate.allowed) return tooMany(ipRate.retryAfterMs);
  const daily = await hit(`guess:recover:${handle}`, { limit: 12, windowMs: 24 * 60 * 60 * 1000 });
  if (!daily.allowed) return tooMany(daily.retryAfterMs);

  if (!combinationStrengthOk(parsed.data.newPhrase)) {
    return error("new combination too weak — need 4 words and a number", 400);
  }

  const user = await prisma.user.findUnique({ where: { handle } });
  const live =
    !!user?.recoveryCodeHash &&
    !!user.recoveryCodeExpiresAt &&
    user.recoveryCodeExpiresAt.getTime() > Date.now() &&
    user.recoveryAttempts < MAX_ATTEMPTS;

  const passed = await verifySecret(live ? user!.recoveryCodeHash! : DUMMY_HASH, parsed.data.emailCode.trim());
  if (!user || !live || !passed) {
    if (user && live) {
      await prisma.user.update({ where: { id: user.id }, data: { recoveryAttempts: { increment: 1 } } });
    }
    return error("that code didn't work — request a new one", 401);
  }

  const normalized = normalizeCombination(parsed.data.newPhrase);
  // burn the code atomically so it can't be used twice in parallel
  const { count } = await prisma.user.updateMany({
    where: { id: user.id, recoveryCodeHash: user.recoveryCodeHash },
    data: {
      combinationHash: await hashSecret(normalized),
      lookupHash: lookupHash(`${user.handle}:${normalized}`),
      recoveryCodeHash: null,
      recoveryCodeExpiresAt: null,
      recoveryAttempts: 0,
    },
  });
  if (count !== 1) return error("that code didn't work — request a new one", 401);

  // a reset signs every other device out
  await prisma.session.deleteMany({ where: { userId: user.id } });
  await createSession(user.id);
  return json({ handle: user.handle });
}

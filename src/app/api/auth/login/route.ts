import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { normalizeCombination, normalizeHandle } from "@/lib/auth/combination";
import { DUMMY_HASH, verifySecret } from "@/lib/auth/crypto";
import { createSession } from "@/lib/auth/session";
import { clear, fail, failed, hit, LIMITS } from "@/lib/auth/rate-limit";
import { clientIp, error, json, readJson, tooMany } from "@/lib/server/http";

export const dynamic = "force-dynamic";

// Sign in with handle + combination. The handle picks the account; the
// combination is checked against that account only, so a guess can never
// unlock "whichever account happens to use this phrase".
const schema = z.object({
  handle: z.string().min(1).max(40),
  phrase: z.string().min(3).max(200),
});

// combinations saved before separators were widened normalised only these
function legacyNormalize(input: string) {
  return input.toLowerCase().replace(/[·,/|]+/g, " ").replace(/\s+/g, " ").trim();
}

export async function POST(req: NextRequest) {
  const parsed = schema.safeParse(await readJson(req));
  if (!parsed.success) return error("add your handle and combination", 400);

  const handle = normalizeHandle(parsed.data.handle);
  const key = `login:${handle}`;

  const ipRate = await hit(`auth:ip:${clientIp(req)}`, LIMITS.authIp);
  if (!ipRate.allowed) return tooMany(ipRate.retryAfterMs);
  const backoff = await failed(key);
  if (!backoff.allowed) return tooMany(backoff.retryAfterMs);

  const user = await prisma.user.findUnique({ where: { handle } });
  const phrase = normalizeCombination(parsed.data.phrase);
  const legacy = legacyNormalize(parsed.data.phrase);

  // always spend one argon2 verify so a missing handle costs the same time
  let ok = await verifySecret(user?.combinationHash ?? DUMMY_HASH, phrase);
  if (!ok && user?.combinationHash && legacy !== phrase) {
    ok = await verifySecret(user.combinationHash, legacy);
  }

  if (!user || !ok) {
    await fail(key);
    return error("the combination didn't turn — check your handle and combination", 401);
  }

  await clear(key);
  await createSession(user.id);
  return json({ handle: user.handle });
}

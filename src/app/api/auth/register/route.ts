import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import {
  normalizeCombination,
  combinationStrengthOk,
  normalizeHandle,
  isValidHandle,
} from "@/lib/auth/combination";
import { hashSecret, lookupHash } from "@/lib/auth/crypto";
import { createSession } from "@/lib/auth/session";
import { hit, LIMITS } from "@/lib/auth/rate-limit";
import { groundSchema } from "@/lib/server/schemas";
import { clientIp, error, isUniqueViolation, json, readJson, tooMany } from "@/lib/server/http";
import { wardrobeCreateData } from "@/lib/wardrobe";

export const dynamic = "force-dynamic";

// Create a combination account. An email is *not* taken here: it would be
// unverified, and an unverified email lets someone squat another person's
// address. It's added (with a code) from the account panel instead.
const schema = z.object({
  phrase: z.string().min(3).max(200),
  handle: z.string().min(2).max(30),
  displayName: z.string().max(40).optional(),
  defaultTheme: groundSchema.default("daylight"),
});

export async function POST(req: NextRequest) {
  const parsed = schema.safeParse(await readJson(req));
  if (!parsed.success) return error("invalid input", 400);
  const { phrase, displayName, defaultTheme } = parsed.data;

  const ipRate = await hit(`register:ip:${clientIp(req)}`, { limit: 10, windowMs: 60 * 60 * 1000 });
  if (!ipRate.allowed) return tooMany(ipRate.retryAfterMs);
  const authRate = await hit(`auth:ip:${clientIp(req)}`, LIMITS.authIp);
  if (!authRate.allowed) return tooMany(authRate.retryAfterMs);

  if (!combinationStrengthOk(phrase)) {
    return error("combination too weak — need 4 words and a number", 400);
  }

  const handle = normalizeHandle(parsed.data.handle);
  if (!isValidHandle(handle)) {
    return error("handle must be 2–30 letters, numbers or hyphens", 400);
  }

  const normalized = normalizeCombination(phrase);
  try {
    const user = await prisma.user.create({
      data: {
        handle,
        displayName,
        defaultTheme,
        combinationHash: await hashSecret(normalized),
        // kept for the unique index only; sign-in looks accounts up by handle
        lookupHash: lookupHash(`${handle}:${normalized}`),
        wardrobes: {
          create: wardrobeCreateData("closet", { title: `${handle}'s wardrobe`, ground: defaultTheme }),
        },
      },
    });
    await createSession(user.id);
    return json({ handle: user.handle });
  } catch (e) {
    if (isUniqueViolation(e)) return error("that handle is taken — pick another", 409);
    throw e;
  }
}

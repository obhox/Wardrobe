import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { normalizeEmail, isValidEmail } from "@/lib/auth/crypto";
import { generateCombination, normalizeHandle } from "@/lib/auth/combination";
import { createSession } from "@/lib/auth/session";
import { hit, LIMITS } from "@/lib/auth/rate-limit";
import { codeError, consumeCode } from "@/lib/server/codes";
import { clientIp, error, isUniqueViolation, json, readJson, tooMany } from "@/lib/server/http";
import { wardrobeCreateData } from "@/lib/wardrobe";

export const dynamic = "force-dynamic";

// POST { email, code } → verify the magic code, then either sign into the
// existing email account or create a fresh passwordless one.
const schema = z.object({
  email: z.string().min(3).max(254),
  code: z.string().min(4).max(8),
});

// a creature handle that isn't taken, checked in one query
async function uniqueHandle(): Promise<string> {
  const bases = Array.from({ length: 6 }, () => normalizeHandle(generateCombination().handle));
  const candidates = bases.flatMap((b) => [b, ...Array.from({ length: 8 }, (_, i) => `${b}-${Math.floor(Math.random() * 90) + 10 + i}`)]);
  const taken = new Set(
    (await prisma.user.findMany({ where: { handle: { in: candidates } }, select: { handle: true } })).map((u) => u.handle)
  );
  return candidates.find((c) => !taken.has(c)) ?? `${bases[0]}-${Date.now().toString(36)}`;
}

export async function POST(req: NextRequest) {
  const parsed = schema.safeParse(await readJson(req));
  if (!parsed.success || !isValidEmail(parsed.data.email)) return error("invalid input", 400);
  const email = normalizeEmail(parsed.data.email);

  const ipRate = await hit(`auth:ip:${clientIp(req)}`, LIMITS.authIp);
  if (!ipRate.allowed) return tooMany(ipRate.retryAfterMs);

  const result = await consumeCode(email, parsed.data.code.trim());
  if (result !== "ok") {
    const { message, status } = codeError(result);
    return error(message, status);
  }

  const existing = await prisma.user.findUnique({ where: { recoveryEmail: email } });
  if (existing) {
    await createSession(existing.id);
    return json({ handle: existing.handle, created: false });
  }

  // new passwordless account (no combination set)
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const handle = await uniqueHandle();
      const user = await prisma.user.create({
        data: {
          handle,
          recoveryEmail: email,
          defaultTheme: "daylight",
          wardrobes: { create: wardrobeCreateData("closet", { title: `${handle}'s wardrobe` }) },
        },
      });
      await createSession(user.id);
      return json({ handle: user.handle, created: true });
    } catch (e) {
      if (!isUniqueViolation(e)) throw e;
      // raced: either the handle or the email was just taken — re-check email
      const again = await prisma.user.findUnique({ where: { recoveryEmail: email } });
      if (again) {
        await createSession(again.id);
        return json({ handle: again.handle, created: false });
      }
    }
  }
  return error("couldn't make your wardrobe — try again", 500);
}

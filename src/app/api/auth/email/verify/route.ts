import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { verifySecret, normalizeEmail, isValidEmail } from "@/lib/auth/crypto";
import { generateCombination, normalizeHandle } from "@/lib/auth/combination";
import { createSession } from "@/lib/auth/session";
import { checkRate, recordFailure, recordSuccess } from "@/lib/auth/rate-limit";

export const dynamic = "force-dynamic";

// POST { email, code } → verify the magic code, then either sign into the
// existing email account or create a fresh passwordless one.
const schema = z.object({
  email: z.string().min(3).max(254),
  code: z.string().min(4).max(8),
});

const MAX_ATTEMPTS = 6;

// pick a handle that isn't taken: a creature word, then -2, -3, … if needed.
async function uniqueHandle(): Promise<string> {
  for (let i = 0; i < 50; i++) {
    const base = normalizeHandle(generateCombination().handle);
    const candidate = i === 0 ? base : `${base}-${i + 1}`;
    const taken = await prisma.user.findUnique({ where: { handle: candidate } });
    if (!taken) return candidate;
  }
  // extremely unlikely fallback
  return normalizeHandle(`${generateCombination().handle}-${generateCombination().digit}${generateCombination().digit}`);
}

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "bad json" }, { status: 400 });
  }
  const parsed = schema.safeParse(body);
  if (!parsed.success || !isValidEmail(parsed.data.email)) {
    return NextResponse.json({ error: "invalid input" }, { status: 400 });
  }
  const email = normalizeEmail(parsed.data.email);
  const code = parsed.data.code.trim();

  const key = `email-verify:${email}`;
  const rate = checkRate(key);
  if (!rate.allowed) {
    return NextResponse.json(
      { error: "too many tries — wait a moment", retryAfterMs: rate.retryAfterMs },
      { status: 429 }
    );
  }

  const record = await prisma.emailCode.findUnique({ where: { email } });
  const live = record && record.expiresAt.getTime() > Date.now() && record.attempts < MAX_ATTEMPTS;
  if (!live) {
    recordFailure(key);
    return NextResponse.json({ error: "that code expired — request a new one" }, { status: 401 });
  }

  const ok = await verifySecret(record.codeHash, code);
  if (!ok) {
    await prisma.emailCode.update({
      where: { email },
      data: { attempts: { increment: 1 } },
    });
    recordFailure(key);
    return NextResponse.json({ error: "that code didn't match" }, { status: 401 });
  }

  // code is good — consume it
  await prisma.emailCode.delete({ where: { email } });
  recordSuccess(key);

  // existing email account → sign in
  const existing = await prisma.user.findUnique({ where: { recoveryEmail: email } });
  if (existing) {
    await createSession(existing.id);
    return NextResponse.json({ handle: existing.handle, created: false });
  }

  // new passwordless account → create it (no combination set)
  const handle = await uniqueHandle();
  const user = await prisma.user.create({
    data: {
      handle,
      recoveryEmail: email,
      defaultTheme: "daylight",
      wardrobes: {
        create: {
          title: `${handle}'s wardrobe`,
          tagline: "everything, arranged just so.",
          ground: "daylight",
          sections: {
            create: [
              { name: "tops", icon: "✦", color: "cobalt", order: 0 },
              { name: "shoes", icon: "✦", color: "terracotta", order: 1 },
              { name: "bags", icon: "✦", color: "honey", order: 2 },
            ],
          },
        },
      },
    },
  });

  await createSession(user.id);
  return NextResponse.json({ handle: user.handle, created: true });
}

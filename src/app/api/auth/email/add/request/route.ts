import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import {
  hashSecret,
  generateRecoveryCode,
  normalizeEmail,
  isValidEmail,
} from "@/lib/auth/crypto";
import { sendMail, verifyEmailCodeEmail } from "@/lib/auth/mailer";
import { getCurrentUser } from "@/lib/auth/session";
import { checkRate } from "@/lib/auth/rate-limit";

export const dynamic = "force-dynamic";

// Logged-in user attaching an email to their existing account. We confirm
// ownership with a code before saving it (email is a sign-in identity).
const schema = z.object({ email: z.string().min(3).max(254) });

const CODE_TTL_MS = 15 * 60 * 1000;

export async function POST(req: NextRequest) {
  const me = await getCurrentUser();
  if (!me) return NextResponse.json({ error: "not signed in" }, { status: 401 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "bad json" }, { status: 400 });
  }
  const parsed = schema.safeParse(body);
  if (!parsed.success || !isValidEmail(parsed.data.email)) {
    return NextResponse.json({ error: "that email doesn't look right" }, { status: 400 });
  }
  const email = normalizeEmail(parsed.data.email);

  const rate = checkRate(`email-add:${me.id}`);
  if (!rate.allowed) {
    return NextResponse.json(
      { error: "too many tries — wait a moment", retryAfterMs: rate.retryAfterMs },
      { status: 429 }
    );
  }

  // email must not already belong to another account (it's unique + a login id)
  const owner = await prisma.user.findUnique({ where: { recoveryEmail: email } });
  if (owner && owner.id !== me.id) {
    return NextResponse.json(
      { error: "that email is already on another wardrobe" },
      { status: 409 }
    );
  }
  if (owner && owner.id === me.id) {
    return NextResponse.json(
      { error: "that email is already on your wardrobe" },
      { status: 409 }
    );
  }

  const code = generateRecoveryCode(6);
  await prisma.emailCode.upsert({
    where: { email },
    create: { email, codeHash: await hashSecret(code), expiresAt: new Date(Date.now() + CODE_TTL_MS) },
    update: { codeHash: await hashSecret(code), expiresAt: new Date(Date.now() + CODE_TTL_MS), attempts: 0 },
  });

  try {
    await sendMail({ to: email, ...verifyEmailCodeEmail(code) });
  } catch (e) {
    console.error("[email:add:request] mail failed", e);
    return NextResponse.json(
      { error: "couldn't send the email — check the mail setup and try again" },
      { status: 502 }
    );
  }

  return NextResponse.json({ sent: true });
}

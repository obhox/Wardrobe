import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import {
  hashSecret,
  generateRecoveryCode,
  normalizeEmail,
  isValidEmail,
} from "@/lib/auth/crypto";
import { sendMail, magicCodeEmail } from "@/lib/auth/mailer";
import { checkRate } from "@/lib/auth/rate-limit";

export const dynamic = "force-dynamic";

// POST { email } → send a 6-digit magic code that both signs in an existing
// email account and creates a new one. Always returns { sent: true } so we
// never reveal whether an account already exists.
const schema = z.object({ email: z.string().min(3).max(254) });

const CODE_TTL_MS = 15 * 60 * 1000;

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "bad json" }, { status: 400 });
  }
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid input" }, { status: 400 });
  }

  if (!isValidEmail(parsed.data.email)) {
    return NextResponse.json({ error: "that email doesn't look right" }, { status: 400 });
  }
  const email = normalizeEmail(parsed.data.email);

  const rate = checkRate(`email-req:${email}`);
  if (!rate.allowed) {
    return NextResponse.json(
      { error: "too many tries — wait a moment", retryAfterMs: rate.retryAfterMs },
      { status: 429 }
    );
  }

  const code = generateRecoveryCode(6);
  const codeHash = await hashSecret(code);
  const expiresAt = new Date(Date.now() + CODE_TTL_MS);

  // one active code per email — replace any prior one
  await prisma.emailCode.upsert({
    where: { email },
    create: { email, codeHash, expiresAt },
    update: { codeHash, expiresAt, attempts: 0 },
  });

  const mail = magicCodeEmail(code);
  try {
    await sendMail({ to: email, ...mail });
  } catch (e) {
    console.error("[email:request] mail failed", e);
    // for sign-in, a send failure means the user can't get in — surface it.
    return NextResponse.json(
      { error: "couldn't send the email — check the mail setup and try again" },
      { status: 502 }
    );
  }

  return NextResponse.json({ sent: true });
}

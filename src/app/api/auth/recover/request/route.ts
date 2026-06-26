import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { hashSecret, generateRecoveryCode } from "@/lib/auth/crypto";
import { sendMail, recoveryCodeEmail } from "@/lib/auth/mailer";
import { checkRate, recordFailure } from "@/lib/auth/rate-limit";

export const dynamic = "force-dynamic";

// POST { handle } → if the account has a recovery email, generate a short
// code, store its hash with a 15-min expiry, and email it.
// Always returns a generic { sent: true } so we never reveal whether an
// account exists or has an email on file (anti-enumeration).
const schema = z.object({ handle: z.string().min(1).max(40) });

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

  const handle = parsed.data.handle.trim().toLowerCase();
  const key = `recover-req:${handle}`;
  const rate = checkRate(key);
  if (!rate.allowed) {
    return NextResponse.json(
      { error: "too many tries — wait a moment", retryAfterMs: rate.retryAfterMs },
      { status: 429 }
    );
  }

  const user = await prisma.user.findUnique({ where: { handle } });

  // only do real work when there's an account with an email — but the
  // response is identical either way.
  if (user?.recoveryEmail) {
    const code = generateRecoveryCode(6);
    await prisma.user.update({
      where: { id: user.id },
      data: {
        recoveryCodeHash: await hashSecret(code),
        recoveryCodeExpiresAt: new Date(Date.now() + CODE_TTL_MS),
      },
    });
    const mail = recoveryCodeEmail(user.handle, code);
    try {
      await sendMail({ to: user.recoveryEmail, ...mail });
    } catch (e) {
      console.error("[recover:request] mail failed", e);
      return NextResponse.json(
        { error: "couldn't send the email — check the mail setup and try again" },
        { status: 502 }
      );
    }
  } else {
    // keep timing roughly even and burn a rate slot to slow probing
    recordFailure(key);
  }

  return NextResponse.json({ sent: true });
}

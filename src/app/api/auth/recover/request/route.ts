import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { hashSecret, generateRecoveryCode } from "@/lib/auth/crypto";
import { normalizeHandle } from "@/lib/auth/combination";
import { sendMail, recoveryCodeEmail } from "@/lib/auth/mailer";
import { canSendMail, CODE_TTL_MS } from "@/lib/server/codes";
import { clientIp, error, json, readJson, tooMany } from "@/lib/server/http";

export const dynamic = "force-dynamic";

// POST { handle } → if the account has an email, email it a reset code.
// Always answers { sent: true } (no account / email enumeration).
const schema = z.object({ handle: z.string().min(1).max(40) });

export async function POST(req: NextRequest) {
  const parsed = schema.safeParse(await readJson(req));
  if (!parsed.success) return error("invalid input", 400);

  const handle = normalizeHandle(parsed.data.handle);
  const rate = await canSendMail(`handle:${handle}`, clientIp(req));
  if (!rate.allowed) return tooMany(rate.retryAfterMs);

  const user = await prisma.user.findUnique({ where: { handle } });
  if (user?.recoveryEmail) {
    const code = generateRecoveryCode(6);
    await prisma.user.update({
      where: { id: user.id },
      data: {
        recoveryCodeHash: await hashSecret(code),
        recoveryCodeExpiresAt: new Date(Date.now() + CODE_TTL_MS),
        recoveryAttempts: 0,
      },
    });
    try {
      await sendMail({ to: user.recoveryEmail, ...recoveryCodeEmail(user.handle, code) });
    } catch (e) {
      console.error("[recover:request] mail failed", e instanceof Error ? e.message : e);
      return error("couldn't send the email — try again in a moment", 502);
    }
  }
  return json({ sent: true });
}

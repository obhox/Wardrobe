import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { normalizeEmail, isValidEmail } from "@/lib/auth/crypto";
import { sendMail, verifyEmailCodeEmail } from "@/lib/auth/mailer";
import { getCurrentUser } from "@/lib/auth/session";
import { canSendMail, issueCode } from "@/lib/server/codes";
import { clientIp, error, json, readJson, tooMany, unauthorized } from "@/lib/server/http";

export const dynamic = "force-dynamic";

// Logged-in user attaching an email to their account. Ownership is proven
// with a code before it's saved. The response never says whether the
// address belongs to someone else (that's checked again at verify time).
const schema = z.object({ email: z.string().min(3).max(254) });

export async function POST(req: NextRequest) {
  const me = await getCurrentUser();
  if (!me) return unauthorized();

  const parsed = schema.safeParse(await readJson(req));
  if (!parsed.success || !isValidEmail(parsed.data.email)) {
    return error("that email doesn't look right", 400);
  }
  const email = normalizeEmail(parsed.data.email);
  if (email === me.email) return error("that email is already on your wardrobe", 409);

  const rate = await canSendMail(email, clientIp(req));
  if (!rate.allowed) return tooMany(rate.retryAfterMs);

  const owner = await prisma.user.findUnique({ where: { recoveryEmail: email }, select: { id: true } });
  if (!owner) {
    const code = await issueCode(email);
    try {
      await sendMail({ to: email, ...verifyEmailCodeEmail(code) });
    } catch (e) {
      console.error("[email:add:request] mail failed", e instanceof Error ? e.message : e);
      return error("couldn't send the email — try again in a moment", 502);
    }
  }
  return json({ sent: true });
}

import { NextRequest } from "next/server";
import { z } from "zod";
import { normalizeEmail, isValidEmail } from "@/lib/auth/crypto";
import { sendMail, magicCodeEmail } from "@/lib/auth/mailer";
import { canSendMail, issueCode } from "@/lib/server/codes";
import { clientIp, error, json, readJson, tooMany } from "@/lib/server/http";

export const dynamic = "force-dynamic";

// POST { email } → send a 6-digit magic code that both signs in an existing
// email account and creates a new one. Always returns { sent: true } so we
// never reveal whether an account already exists.
const schema = z.object({ email: z.string().min(3).max(254) });

export async function POST(req: NextRequest) {
  const parsed = schema.safeParse(await readJson(req));
  if (!parsed.success || !isValidEmail(parsed.data.email)) {
    return error("that email doesn't look right", 400);
  }
  const email = normalizeEmail(parsed.data.email);

  const rate = await canSendMail(email, clientIp(req));
  if (!rate.allowed) return tooMany(rate.retryAfterMs);

  const code = await issueCode(email);
  try {
    await sendMail({ to: email, ...magicCodeEmail(code) });
  } catch (e) {
    console.error("[email:request] mail failed", e instanceof Error ? e.message : e);
    return error("couldn't send the email — try again in a moment", 502);
  }
  return json({ sent: true });
}

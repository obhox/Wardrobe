import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { normalizeEmail, isValidEmail } from "@/lib/auth/crypto";
import { getCurrentUser } from "@/lib/auth/session";
import { codeError, consumeCode } from "@/lib/server/codes";
import { error, isUniqueViolation, json, readJson, unauthorized } from "@/lib/server/http";

export const dynamic = "force-dynamic";

// Logged-in user confirms the code → the email is attached to their account.
const schema = z.object({
  email: z.string().min(3).max(254),
  code: z.string().min(4).max(8),
});

export async function POST(req: NextRequest) {
  const me = await getCurrentUser();
  if (!me) return unauthorized();

  const parsed = schema.safeParse(await readJson(req));
  if (!parsed.success || !isValidEmail(parsed.data.email)) return error("invalid input", 400);
  const email = normalizeEmail(parsed.data.email);

  const result = await consumeCode(email, parsed.data.code.trim());
  if (result !== "ok") {
    const { message, status } = codeError(result);
    return error(message, status);
  }

  try {
    await prisma.user.update({ where: { id: me.id }, data: { recoveryEmail: email } });
  } catch (e) {
    if (isUniqueViolation(e)) return error("that email is already on another wardrobe", 409);
    throw e;
  }
  return json({ email });
}

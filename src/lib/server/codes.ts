import "server-only";
import { prisma } from "@/lib/db";
import { hashSecret, generateRecoveryCode, verifySecret } from "@/lib/auth/crypto";
import { hit, LIMITS, type RateResult } from "@/lib/auth/rate-limit";

// Emailed one-time codes (sign-in, add-email). One live code per address.

export const CODE_TTL_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS_PER_CODE = 5;
const DAY = 24 * 60 * 60 * 1000;

/** Rate-limit sending mail to this address / from this IP. */
export async function canSendMail(email: string, ip: string): Promise<RateResult> {
  const perEmail = await hit(`mail:e:${email}`, LIMITS.mailPerEmail);
  if (!perEmail.allowed) return perEmail;
  const perDay = await hit(`mail:ed:${email}`, { limit: 10, windowMs: DAY });
  if (!perDay.allowed) return perDay;
  return hit(`mail:ip:${ip}`, LIMITS.mailPerIp);
}

/** Create (or replace) the live code for an email; returns the raw code to send. */
export async function issueCode(email: string): Promise<string> {
  const code = generateRecoveryCode(6);
  const codeHash = await hashSecret(code);
  const expiresAt = new Date(Date.now() + CODE_TTL_MS);
  await prisma.emailCode.upsert({
    where: { email },
    create: { email, codeHash, expiresAt },
    // a fresh code gets a fresh per-code budget; the daily guess cap below
    // is what bounds brute force across re-requests
    update: { codeHash, expiresAt, attempts: 0 },
  });
  return code;
}

export type CheckResult = "ok" | "expired" | "wrong" | "limited";

/** Verify and consume the code for an email (single use, race-safe). */
export async function consumeCode(email: string, code: string): Promise<CheckResult> {
  const daily = await hit(`guess:e:${email}`, { limit: 12, windowMs: DAY });
  if (!daily.allowed) return "limited";

  const record = await prisma.emailCode.findUnique({ where: { email } });
  if (!record || record.expiresAt.getTime() < Date.now() || record.attempts >= MAX_ATTEMPTS_PER_CODE)
    return "expired";

  if (!(await verifySecret(record.codeHash, code))) {
    await prisma.emailCode.updateMany({ where: { id: record.id }, data: { attempts: { increment: 1 } } });
    return "wrong";
  }
  // consume atomically — two concurrent verifies can't both win
  const { count } = await prisma.emailCode.deleteMany({ where: { id: record.id } });
  return count === 1 ? "ok" : "expired";
}

export function codeError(r: CheckResult): { message: string; status: number } {
  switch (r) {
    case "limited":
      return { message: "too many tries today — request a new code tomorrow", status: 429 };
    case "wrong":
      return { message: "that code didn't match", status: 401 };
    default:
      return { message: "that code expired — request a new one", status: 401 };
  }
}

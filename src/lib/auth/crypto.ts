import "server-only";
import argon2 from "argon2";
import crypto from "crypto";
import { env } from "@/lib/env";

const ARGON_OPTS: argon2.Options = {
  type: argon2.argon2id,
  memoryCost: 19456, // ~19 MB
  timeCost: 2,
  parallelism: 1,
};

export async function hashSecret(secret: string): Promise<string> {
  return argon2.hash(secret, ARGON_OPTS);
}

export async function verifySecret(
  hash: string,
  secret: string
): Promise<boolean> {
  try {
    return await argon2.verify(hash, secret);
  } catch {
    return false;
  }
}

// Separate salted (HMAC) lookup hash — lets us find an account without
// exposing the combination, in constant time.
export function lookupHash(normalizedCombination: string): string {
  return crypto
    .createHmac("sha256", env.lookupPepper)
    .update(normalizedCombination)
    .digest("hex");
}

export function sha256(input: string): string {
  return crypto.createHash("sha256").update(input).digest("hex");
}

// Short HMAC used to sign URLs we hand out (e.g. guest image proxy links).
export function sign(value: string): string {
  return crypto.createHmac("sha256", env.signingSecret).update(value).digest("base64url").slice(0, 22);
}

export function verifySignature(value: string, sig: string | null | undefined): boolean {
  if (!sig) return false;
  const expected = Buffer.from(sign(value));
  const given = Buffer.from(sig);
  return expected.length === given.length && crypto.timingSafeEqual(expected, given);
}

// A fixed argon2 hash to verify against when an account doesn't exist, so a
// miss costs the same time as a hit (no user enumeration by timing).
export const DUMMY_HASH =
  "$argon2id$v=19$m=19456,t=2,p=1$ZHVtbXlzYWx0ZHVtbXk$" + "RdescudvJCsgt3ub+b+dWRWJTmaaJObG0Ud+1qeT0Nk";

export function randomToken(bytes = 32): string {
  return crypto.randomBytes(bytes).toString("base64url");
}

// normalize an email for storage/compare (trim + lowercase).
export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

// pragmatic email shape check — catches typos, not RFC-perfect.
export function isValidEmail(email: string): boolean {
  const e = normalizeEmail(email);
  return e.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);
}

// short numeric reset code emailed to the user (digits only, leading zeros kept).
export function generateRecoveryCode(digits = 6): string {
  return crypto.randomInt(10 ** digits).toString().padStart(digits, "0");
}

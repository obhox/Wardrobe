import "server-only";
import argon2 from "argon2";
import crypto from "crypto";

// Pepper for the separate, constant-time account lookup hash (brief §24).
// Set LOOKUP_PEPPER in production; falls back to a dev value otherwise.
const LOOKUP_PEPPER = process.env.LOOKUP_PEPPER ?? "wardrobe-dev-pepper";

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
    .createHmac("sha256", LOOKUP_PEPPER)
    .update(normalizedCombination)
    .digest("hex");
}

export function randomToken(bytes = 32): string {
  return crypto.randomBytes(bytes).toString("base64url");
}

// normalize recovery answers (trim, lowercase, collapse spaces) (brief §24)
export function normalizeAnswer(answer: string): string {
  return answer.toLowerCase().replace(/\s+/g, " ").trim();
}

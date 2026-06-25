import "server-only";

// WebAuthn / passkey configuration (brief §24 "the second turn").
// rpID must match the site's domain; origin must match the full URL.
// Configure via env in production (Railway): RP_ID + APP_ORIGIN.

export function rpID(): string {
  return process.env.RP_ID ?? "localhost";
}

export function rpName(): string {
  return "wardrobe";
}

export function expectedOrigin(): string {
  return process.env.APP_ORIGIN ?? "http://localhost:3000";
}

export const CHALLENGE_TTL_MS = 5 * 60 * 1000; // 5 minutes

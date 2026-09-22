import "server-only";
import { env } from "@/lib/env";

// WebAuthn / passkey configuration (brief §24 "the second turn").
// rpID must match the site's domain; origin must match the full URL.
// Configure via env in production: RP_ID + APP_ORIGIN.

export function rpID(): string {
  return env.rpId;
}

export function rpName(): string {
  return "wardrobe";
}

export function expectedOrigin(): string {
  return env.appOrigin;
}

export const CHALLENGE_TTL_MS = 5 * 60 * 1000; // 5 minutes

// the pending challenge's row id rides in a short-lived httpOnly cookie, so
// concurrent sign-ins never pick up each other's challenge
export const CHALLENGE_COOKIE = "wardrobe_webauthn";

export type Transport = "ble" | "cable" | "hybrid" | "internal" | "nfc" | "smart-card" | "usb";

export function parseTransports(s: string | null | undefined): Transport[] | undefined {
  return s ? (s.split(",") as Transport[]) : undefined;
}

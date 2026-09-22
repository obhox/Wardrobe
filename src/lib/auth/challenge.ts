import "server-only";
import { cookies } from "next/headers";
import { prisma } from "@/lib/db";
import { CHALLENGE_COOKIE, CHALLENGE_TTL_MS } from "./webauthn";

// A WebAuthn challenge is stored server-side and its row id is pinned to this
// browser with a short-lived httpOnly cookie.

export async function saveChallenge(challenge: string, kind: "register" | "authenticate", userId?: string) {
  const row = await prisma.webAuthnChallenge.create({
    data: { challenge, kind, userId, expiresAt: new Date(Date.now() + CHALLENGE_TTL_MS) },
  });
  (await cookies()).set(CHALLENGE_COOKIE, row.id, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/api/auth/passkey",
    maxAge: CHALLENGE_TTL_MS / 1000,
  });
}

/** Take (and delete) this browser's pending challenge. Single use. */
export async function takeChallenge(kind: "register" | "authenticate", userId?: string): Promise<string | null> {
  const jar = await cookies();
  const id = jar.get(CHALLENGE_COOKIE)?.value;
  jar.delete({ name: CHALLENGE_COOKIE, path: "/api/auth/passkey" });
  if (!id) return null;
  const row = await prisma.webAuthnChallenge.findUnique({ where: { id } });
  if (!row || row.kind !== kind || (userId && row.userId !== userId)) return null;
  const { count } = await prisma.webAuthnChallenge.deleteMany({
    where: { id, expiresAt: { gt: new Date() } },
  });
  return count === 1 ? row.challenge : null;
}

import { NextResponse } from "next/server";
import { generateRegistrationOptions } from "@simplewebauthn/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/session";
import { rpID, rpName, CHALLENGE_TTL_MS } from "@/lib/auth/webauthn";

export const dynamic = "force-dynamic";

export async function POST() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const existing = await prisma.passkey.findMany({ where: { userId: user.id } });

  const options = await generateRegistrationOptions({
    rpName: rpName(),
    rpID: rpID(),
    userID: new TextEncoder().encode(user.id),
    userName: user.handle,
    userDisplayName: user.displayName ?? user.handle,
    attestationType: "none",
    excludeCredentials: existing.map((c) => ({
      id: c.credentialId,
      transports: c.transports?.split(",") as
        | ("ble" | "hybrid" | "internal" | "nfc" | "usb")[]
        | undefined,
    })),
    authenticatorSelection: {
      residentKey: "preferred",
      userVerification: "preferred",
    },
  });

  await prisma.webAuthnChallenge.create({
    data: {
      userId: user.id,
      challenge: options.challenge,
      kind: "register",
      expiresAt: new Date(Date.now() + CHALLENGE_TTL_MS),
    },
  });

  return NextResponse.json(options);
}

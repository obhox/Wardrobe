import { NextResponse } from "next/server";
import { generateAuthenticationOptions } from "@simplewebauthn/server";
import { prisma } from "@/lib/db";
import { rpID, CHALLENGE_TTL_MS } from "@/lib/auth/webauthn";

export const dynamic = "force-dynamic";

// Usernameless authentication using discoverable credentials.
export async function POST() {
  const options = await generateAuthenticationOptions({
    rpID: rpID(),
    userVerification: "preferred",
    allowCredentials: [], // discoverable — let the authenticator choose
  });

  await prisma.webAuthnChallenge.create({
    data: {
      challenge: options.challenge,
      kind: "authenticate",
      expiresAt: new Date(Date.now() + CHALLENGE_TTL_MS),
    },
  });

  return NextResponse.json(options);
}

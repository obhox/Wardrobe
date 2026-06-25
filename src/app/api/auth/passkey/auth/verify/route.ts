import { NextRequest, NextResponse } from "next/server";
import { verifyAuthenticationResponse } from "@simplewebauthn/server";
import { prisma } from "@/lib/db";
import { rpID, expectedOrigin } from "@/lib/auth/webauthn";
import { createSession } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body?.id) return NextResponse.json({ error: "bad json" }, { status: 400 });

  const passkey = await prisma.passkey.findUnique({
    where: { credentialId: body.id },
    include: { user: true },
  });
  if (!passkey) {
    return NextResponse.json({ error: "unknown passkey" }, { status: 401 });
  }

  const challengeRow = await prisma.webAuthnChallenge.findFirst({
    where: { kind: "authenticate" },
    orderBy: { createdAt: "desc" },
  });
  if (!challengeRow || challengeRow.expiresAt < new Date()) {
    return NextResponse.json({ error: "challenge expired" }, { status: 400 });
  }

  let verification;
  try {
    verification = await verifyAuthenticationResponse({
      response: body,
      expectedChallenge: challengeRow.challenge,
      expectedOrigin: expectedOrigin(),
      expectedRPID: rpID(),
      credential: {
        id: passkey.credentialId,
        publicKey: new Uint8Array(passkey.publicKey),
        counter: Number(passkey.counter),
        transports: passkey.transports?.split(",") as
          | ("ble" | "hybrid" | "internal" | "nfc" | "usb")[]
          | undefined,
      },
    });
  } catch {
    return NextResponse.json({ error: "verification failed" }, { status: 400 });
  }

  if (!verification.verified) {
    return NextResponse.json({ error: "not verified" }, { status: 401 });
  }

  await prisma.passkey.update({
    where: { id: passkey.id },
    data: { counter: BigInt(verification.authenticationInfo.newCounter) },
  });
  await prisma.webAuthnChallenge.deleteMany({ where: { kind: "authenticate" } });

  await createSession(passkey.userId);
  return NextResponse.json({ handle: passkey.user.handle });
}

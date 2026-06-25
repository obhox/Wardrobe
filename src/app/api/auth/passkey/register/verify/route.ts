import { NextRequest, NextResponse } from "next/server";
import { verifyRegistrationResponse } from "@simplewebauthn/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/session";
import { rpID, expectedOrigin } from "@/lib/auth/webauthn";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "bad json" }, { status: 400 });

  const challengeRow = await prisma.webAuthnChallenge.findFirst({
    where: { userId: user.id, kind: "register" },
    orderBy: { createdAt: "desc" },
  });
  if (!challengeRow || challengeRow.expiresAt < new Date()) {
    return NextResponse.json({ error: "challenge expired" }, { status: 400 });
  }

  let verification;
  try {
    verification = await verifyRegistrationResponse({
      response: body,
      expectedChallenge: challengeRow.challenge,
      expectedOrigin: expectedOrigin(),
      expectedRPID: rpID(),
    });
  } catch {
    return NextResponse.json({ error: "verification failed" }, { status: 400 });
  }

  if (!verification.verified || !verification.registrationInfo) {
    return NextResponse.json({ error: "not verified" }, { status: 400 });
  }

  const { credential } = verification.registrationInfo;

  await prisma.passkey.create({
    data: {
      userId: user.id,
      credentialId: credential.id,
      publicKey: Buffer.from(credential.publicKey),
      counter: BigInt(credential.counter),
      transports: credential.transports?.join(","),
      deviceLabel: body?.deviceLabel ?? null,
    },
  });

  await prisma.webAuthnChallenge.deleteMany({
    where: { userId: user.id, kind: "register" },
  });

  return NextResponse.json({ ok: true });
}

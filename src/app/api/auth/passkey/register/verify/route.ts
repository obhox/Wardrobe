import { NextRequest } from "next/server";
import { verifyRegistrationResponse } from "@simplewebauthn/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/session";
import { rpID, expectedOrigin } from "@/lib/auth/webauthn";
import { takeChallenge } from "@/lib/auth/challenge";
import { error, isUniqueViolation, json, readJson, unauthorized } from "@/lib/server/http";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return unauthorized();

  const body = (await readJson(req)) as { deviceLabel?: unknown } | null;
  if (!body) return error("bad request", 400);

  const challenge = await takeChallenge("register", user.id);
  if (!challenge) return error("that took too long — try again", 400);

  let verification;
  try {
    verification = await verifyRegistrationResponse({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      response: body as any,
      expectedChallenge: challenge,
      expectedOrigin: expectedOrigin(),
      expectedRPID: rpID(),
    });
  } catch {
    return error("the passkey couldn't be verified", 400);
  }
  if (!verification.verified || !verification.registrationInfo) {
    return error("the passkey couldn't be verified", 400);
  }

  const { credential } = verification.registrationInfo;
  const label = typeof body.deviceLabel === "string" ? body.deviceLabel.trim().slice(0, 40) || null : null;
  try {
    const pk = await prisma.passkey.create({
      data: {
        userId: user.id,
        credentialId: credential.id,
        publicKey: Buffer.from(credential.publicKey),
        counter: BigInt(credential.counter),
        transports: credential.transports?.join(","),
        deviceLabel: label,
      },
    });
    return json({ id: pk.id, deviceLabel: pk.deviceLabel, createdAt: pk.createdAt });
  } catch (e) {
    if (isUniqueViolation(e)) return error("that passkey is already registered", 409);
    throw e;
  }
}

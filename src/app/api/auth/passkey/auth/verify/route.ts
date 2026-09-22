import { NextRequest } from "next/server";
import { verifyAuthenticationResponse } from "@simplewebauthn/server";
import { prisma } from "@/lib/db";
import { rpID, expectedOrigin, parseTransports } from "@/lib/auth/webauthn";
import { takeChallenge } from "@/lib/auth/challenge";
import { createSession } from "@/lib/auth/session";
import { error, json, readJson } from "@/lib/server/http";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const body = (await readJson(req)) as { id?: string } | null;
  if (!body?.id || typeof body.id !== "string") return error("bad request", 400);

  const challenge = await takeChallenge("authenticate");
  if (!challenge) return error("that took too long — try again", 400);

  const passkey = await prisma.passkey.findUnique({
    where: { credentialId: body.id },
    include: { user: true },
  });
  if (!passkey) return error("this passkey isn't on any wardrobe", 401);

  let verification;
  try {
    verification = await verifyAuthenticationResponse({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      response: body as any,
      expectedChallenge: challenge,
      expectedOrigin: expectedOrigin(),
      expectedRPID: rpID(),
      credential: {
        id: passkey.credentialId,
        publicKey: new Uint8Array(passkey.publicKey),
        counter: Number(passkey.counter),
        transports: parseTransports(passkey.transports),
      },
    });
  } catch {
    return error("the passkey couldn't be verified", 400);
  }
  if (!verification.verified) return error("the passkey couldn't be verified", 401);

  await prisma.passkey.update({
    where: { id: passkey.id },
    data: { counter: BigInt(verification.authenticationInfo.newCounter) },
  });
  await createSession(passkey.userId);
  return json({ handle: passkey.user.handle });
}

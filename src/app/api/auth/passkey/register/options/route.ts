import { generateRegistrationOptions } from "@simplewebauthn/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/session";
import { rpID, rpName, parseTransports } from "@/lib/auth/webauthn";
import { saveChallenge } from "@/lib/auth/challenge";
import { json, unauthorized } from "@/lib/server/http";

export const dynamic = "force-dynamic";

export async function POST() {
  const user = await getCurrentUser();
  if (!user) return unauthorized();

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
      transports: parseTransports(c.transports),
    })),
    authenticatorSelection: {
      residentKey: "required",
      userVerification: "preferred",
    },
  });
  await saveChallenge(options.challenge, "register", user.id);
  return json(options);
}

import { NextRequest } from "next/server";
import { generateAuthenticationOptions } from "@simplewebauthn/server";
import { rpID } from "@/lib/auth/webauthn";
import { saveChallenge } from "@/lib/auth/challenge";
import { hit, LIMITS } from "@/lib/auth/rate-limit";
import { clientIp, json, tooMany } from "@/lib/server/http";

export const dynamic = "force-dynamic";

// Usernameless authentication using discoverable credentials.
export async function POST(req: NextRequest) {
  const rate = await hit(`auth:ip:${clientIp(req)}`, LIMITS.authIp);
  if (!rate.allowed) return tooMany(rate.retryAfterMs);

  const options = await generateAuthenticationOptions({
    rpID: rpID(),
    userVerification: "preferred",
    allowCredentials: [], // discoverable — let the authenticator choose
  });
  await saveChallenge(options.challenge, "authenticate");
  return json(options);
}

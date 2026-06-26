import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import {
  normalizeCombination,
  combinationStrengthOk,
} from "@/lib/auth/combination";
import { hashSecret, lookupHash, verifySecret } from "@/lib/auth/crypto";
import { createSession } from "@/lib/auth/session";
import { checkRate, recordFailure, recordSuccess } from "@/lib/auth/rate-limit";

export const dynamic = "force-dynamic";

// Recovery is email-only: a short code is emailed via /api/auth/recover/request,
// then submitted here with the new combination.
const schema = z.object({
  handle: z.string().min(1),
  emailCode: z.string().min(1),
  newPhrase: z.string().min(3),
});

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "bad json" }, { status: 400 });
  }
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid input" }, { status: 400 });
  }
  const { handle, emailCode, newPhrase } = parsed.data;
  const key = `recover:${handle.toLowerCase()}`;

  const rate = checkRate(key);
  if (!rate.allowed) {
    return NextResponse.json(
      { error: "too many tries — wait a moment", retryAfterMs: rate.retryAfterMs },
      { status: 429 }
    );
  }

  if (!combinationStrengthOk(newPhrase)) {
    return NextResponse.json(
      { error: "new combination too weak — need 3+ words and a digit" },
      { status: 400 }
    );
  }

  const user = await prisma.user.findUnique({
    where: { handle: handle.trim().toLowerCase() },
  });
  if (!user) {
    recordFailure(key);
    return NextResponse.json({ error: "couldn't recover" }, { status: 401 });
  }

  // verify the short code emailed to the recovery address (single-use, time-boxed)
  const notExpired =
    user.recoveryCodeExpiresAt != null &&
    user.recoveryCodeExpiresAt.getTime() > Date.now();
  const passed =
    !!user.recoveryCodeHash &&
    notExpired &&
    (await verifySecret(user.recoveryCodeHash, emailCode.trim()));

  if (!passed) {
    recordFailure(key);
    return NextResponse.json({ error: "couldn't recover" }, { status: 401 });
  }

  // set the new combination
  const normalized = normalizeCombination(newPhrase);
  const newLookup = lookupHash(normalized);
  const clash = await prisma.user.findUnique({ where: { lookupHash: newLookup } });
  if (clash && clash.id !== user.id) {
    return NextResponse.json(
      { error: "that combination is taken — pick another" },
      { status: 409 }
    );
  }

  await prisma.user.update({
    where: { id: user.id },
    data: {
      combinationHash: await hashSecret(normalized),
      lookupHash: newLookup,
      // burn the emailed code so it can't be reused
      recoveryCodeHash: null,
      recoveryCodeExpiresAt: null,
    },
  });
  // invalidate old sessions
  await prisma.session.deleteMany({ where: { userId: user.id } });

  recordSuccess(key);
  await createSession(user.id);
  return NextResponse.json({ handle: user.handle });
}

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { normalizeCombination } from "@/lib/auth/combination";
import { lookupHash, verifySecret } from "@/lib/auth/crypto";
import { createSession } from "@/lib/auth/session";
import { checkRate, recordFailure, recordSuccess } from "@/lib/auth/rate-limit";

export const dynamic = "force-dynamic";

const schema = z.object({ phrase: z.string().min(3) });

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

  const normalized = normalizeCombination(parsed.data.phrase);
  const lh = lookupHash(normalized);

  // rate-limit per combination-lookup (brief §24)
  const rate = checkRate(`login:${lh}`);
  if (!rate.allowed) {
    return NextResponse.json(
      { error: "too many tries — wait a moment", retryAfterMs: rate.retryAfterMs },
      { status: 429 }
    );
  }

  const user = await prisma.user.findUnique({ where: { lookupHash: lh } });
  // email-only accounts have no combination — they can't log in this way.
  // constant-ish time: still run a verify against a dummy when absent.
  const ok = user?.combinationHash
    ? await verifySecret(user.combinationHash, normalized)
    : await verifySecret(
        "$argon2id$v=19$m=19456,t=2,p=1$ZHVtbXlzYWx0$" +
          "0000000000000000000000000000000000000000000",
        normalized
      ).then(() => false);

  if (!user || !ok) {
    recordFailure(`login:${lh}`);
    return NextResponse.json({ error: "the combination didn't turn" }, { status: 401 });
  }

  recordSuccess(`login:${lh}`);
  await createSession(user.id);
  return NextResponse.json({ handle: user.handle });
}

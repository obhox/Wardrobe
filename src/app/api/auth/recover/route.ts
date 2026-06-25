import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import {
  normalizeCombination,
  combinationStrengthOk,
} from "@/lib/auth/combination";
import {
  hashSecret,
  lookupHash,
  normalizeAnswer,
  verifySecret,
} from "@/lib/auth/crypto";
import { createSession } from "@/lib/auth/session";
import { checkRate, recordFailure, recordSuccess } from "@/lib/auth/rate-limit";

export const dynamic = "force-dynamic";

// GET ?handle=moth → the (non-secret) recovery prompts to answer.
export async function GET(req: NextRequest) {
  const handle = req.nextUrl.searchParams.get("handle")?.trim().toLowerCase();
  if (!handle) return NextResponse.json({ error: "handle required" }, { status: 400 });

  const user = await prisma.user.findUnique({
    where: { handle },
    include: { recoveryQuestions: { orderBy: { order: "asc" } } },
  });
  // don't reveal existence — return empty prompts either way
  if (!user || user.recoveryQuestions.length === 0) {
    return NextResponse.json({ prompts: [] });
  }
  return NextResponse.json({
    prompts: user.recoveryQuestions.map((q) => ({ id: q.id, prompt: q.prompt })),
  });
}

const schema = z.object({
  handle: z.string().min(1),
  answers: z.array(z.object({ id: z.string(), answer: z.string() })).optional(),
  recoveryCard: z.string().optional(),
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
  const { handle, answers, recoveryCard, newPhrase } = parsed.data;
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
    include: { recoveryQuestions: true },
  });
  if (!user) {
    recordFailure(key);
    return NextResponse.json({ error: "couldn't recover" }, { status: 401 });
  }

  let passed = false;

  // path A: recovery card
  if (recoveryCard && user.recoveryCardHash) {
    passed = await verifySecret(
      user.recoveryCardHash,
      normalizeCombination(recoveryCard)
    );
  }

  // path B: all secret questions correct (brief §24 — require all)
  if (!passed && answers && user.recoveryQuestions.length > 0) {
    const byId = new Map(answers.map((a) => [a.id, a.answer]));
    const results = await Promise.all(
      user.recoveryQuestions.map(async (q) => {
        const given = byId.get(q.id);
        if (given == null) return false;
        return verifySecret(q.answerHash, normalizeAnswer(given));
      })
    );
    passed = results.length > 0 && results.every(Boolean);
  }

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
    },
  });
  // invalidate old sessions
  await prisma.session.deleteMany({ where: { userId: user.id } });

  recordSuccess(key);
  await createSession(user.id);
  return NextResponse.json({ handle: user.handle });
}

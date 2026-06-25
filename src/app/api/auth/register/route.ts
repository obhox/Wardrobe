import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import {
  normalizeCombination,
  combinationStrengthOk,
  assemble,
  normalizeHandle,
  isValidHandle,
} from "@/lib/auth/combination";
import {
  hashSecret,
  lookupHash,
  normalizeAnswer,
  randomToken,
} from "@/lib/auth/crypto";
import { createSession } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

const schema = z.object({
  phrase: z.string().min(3),
  handle: z.string().min(2).max(30),
  displayName: z.string().max(40).optional(),
  defaultTheme: z.string().default("daylight"),
  recoveryQuestions: z
    .array(z.object({ prompt: z.string().min(2), answer: z.string().min(1) }))
    .max(4)
    .optional(),
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
  const { phrase, displayName, defaultTheme, recoveryQuestions } = parsed.data;

  if (!combinationStrengthOk(phrase)) {
    return NextResponse.json(
      { error: "combination too weak — need 3+ words and a digit" },
      { status: 400 }
    );
  }

  // user-chosen handle (public username)
  const handle = normalizeHandle(parsed.data.handle);
  if (!isValidHandle(handle)) {
    return NextResponse.json(
      { error: "handle must be 2–30 letters, numbers or hyphens" },
      { status: 400 }
    );
  }

  const normalized = normalizeCombination(phrase);
  const lh = lookupHash(normalized);

  // already exists?
  const existing = await prisma.user.findUnique({ where: { lookupHash: lh } });
  if (existing) {
    return NextResponse.json(
      { error: "that combination is taken — reroll one" },
      { status: 409 }
    );
  }

  // handle must be unique — user picks another if taken
  const handleTaken = await prisma.user.findUnique({ where: { handle } });
  if (handleTaken) {
    return NextResponse.json(
      { error: "that handle is taken — pick another" },
      { status: 409 }
    );
  }

  // recovery card — a one-time longer backup combination
  const card = assemble(
    [randomToken(3), randomToken(3), randomToken(3)],
    Math.floor(Math.random() * 90) + 10
  ).phrase;

  const user = await prisma.user.create({
    data: {
      handle,
      displayName,
      defaultTheme,
      combinationHash: await hashSecret(normalized),
      lookupHash: lh,
      recoveryCardHash: await hashSecret(normalizeCombination(card)),
      recoveryQuestions: recoveryQuestions
        ? {
            create: await Promise.all(
              recoveryQuestions.map(async (q, i) => ({
                prompt: q.prompt,
                answerHash: await hashSecret(normalizeAnswer(q.answer)),
                order: i,
              }))
            ),
          }
        : undefined,
      wardrobes: {
        create: {
          title: `${handle}'s wardrobe`,
          tagline: "everything, arranged just so.",
          ground: defaultTheme,
          sections: {
            create: [
              { name: "tops", icon: "✦", color: "cobalt", order: 0 },
              { name: "shoes", icon: "✦", color: "terracotta", order: 1 },
              { name: "bags", icon: "✦", color: "honey", order: 2 },
            ],
          },
        },
      },
    },
  });

  await createSession(user.id);

  return NextResponse.json({
    handle: user.handle,
    recoveryCard: card, // shown once
  });
}

import { NextResponse } from "next/server";
import { generateCombination, estimateEntropyBits } from "@/lib/auth/combination";

export const dynamic = "force-dynamic";

// Returns a fresh combination for the user to accept or reroll.
// Never stored server-side until they register.
export async function GET() {
  const c = generateCombination();
  return NextResponse.json({
    phrase: c.phrase,
    words: c.words,
    digit: c.digit,
    handle: c.handle,
    entropyBits: estimateEntropyBits(),
  });
}

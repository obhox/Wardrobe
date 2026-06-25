import crypto from "crypto";

// "the combination" (brief §24) — a memorable passphrase drawn from a
// closet/object vocabulary, e.g. `linen · brass · moth · 7`.
// Generated, not free-typed, for entropy. 3 words + a digit from large lists.

const MATERIALS = [
  "linen", "wool", "denim", "silk", "suede", "canvas", "velvet", "cotton",
  "cashmere", "leather", "corduroy", "tweed", "satin", "mohair", "flannel",
  "chambray", "jersey", "poplin", "twill", "fleece",
];

const TONES = [
  "brass", "cobalt", "olive", "honey", "blush", "slate", "bone", "sage",
  "ochre", "indigo", "rust", "moss", "cream", "ink", "pewter", "amber",
  "plum", "teal", "clay", "ash",
];

const CREATURES = [
  "moth", "fox", "wren", "hare", "lynx", "crane", "otter", "finch", "stoat",
  "heron", "vole", "newt", "swift", "kite", "shrew", "tern", "ibis", "lark",
  "mole", "owl",
];

const OBJECTS = [
  "button", "hanger", "thread", "needle", "pocket", "collar", "cuff", "lapel",
  "buckle", "zipper", "ribbon", "patch", "seam", "hem", "clasp", "loop",
  "knot", "pleat", "stitch", "frill",
];

const LISTS = [MATERIALS, TONES, CREATURES, OBJECTS];

function pick<T>(arr: T[]): T {
  return arr[crypto.randomInt(arr.length)];
}

export interface Combination {
  words: string[];
  digit: number;
  /** human form: "linen · brass · moth · 7" */
  phrase: string;
  /** normalized (for hashing/lookup) */
  normalized: string;
  /** suggested public handle (creature word), e.g. "moth" — user can override */
  handle: string;
}

export function generateCombination(): Combination {
  // one word from materials, one from tones, one creature (the handle anchor)
  const words = [pick(MATERIALS), pick(TONES), pick(CREATURES)];
  const digit = crypto.randomInt(10);
  return assemble(words, digit);
}

export function assemble(words: string[], digit: number): Combination {
  const phrase = `${words.join(" · ")} · ${digit}`;
  const normalized = normalizeCombination(phrase);
  // suggested handle = the creature word (outward "tag", brief §24).
  // It's only a suggestion now — users pick their own at registration.
  const handle = words[2] ?? words[words.length - 1];
  return { words, digit, phrase, normalized, handle };
}

export function normalizeCombination(input: string): string {
  // strip separators, collapse whitespace, lowercase — order preserved
  return input
    .toLowerCase()
    .replace(/[·,/|]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// public handles: lowercase slug, 2–30 chars, a–z 0–9 and single hyphens.
export function normalizeHandle(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-") // any run of non-slug chars -> single hyphen
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "") // no leading/trailing hyphen
    .slice(0, 30);
}

export function isValidHandle(input: string): boolean {
  const h = normalizeHandle(input);
  return h.length >= 2 && /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/.test(h);
}

export const WORD_BANKS = {
  materials: MATERIALS,
  tones: TONES,
  creatures: CREATURES,
  objects: OBJECTS,
};

// strength floor for customized combinations (brief §24)
export function combinationStrengthOk(input: string): boolean {
  const norm = normalizeCombination(input);
  const tokens = norm.split(" ").filter(Boolean);
  const hasDigit = tokens.some((t) => /\d/.test(t));
  const wordCount = tokens.filter((t) => /[a-z]/.test(t)).length;
  // need at least 3 words and a digit
  return wordCount >= 3 && hasDigit;
}

// rough entropy estimate for UI feedback
export function estimateEntropyBits(): number {
  const space = LISTS.reduce((acc, l) => acc * l.length, 1) * 10;
  return Math.round(Math.log2(space));
}

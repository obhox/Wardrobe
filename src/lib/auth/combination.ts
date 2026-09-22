import crypto from "crypto";

// "the combination" (brief §24) — a memorable passphrase drawn from a
// closet/object vocabulary, e.g. `linen · brass · moth · button · 47`.
// Generated, not free-typed: 4 words from 64-word lists plus a number 0–99
// is 64⁴ × 100 ≈ 1.7 billion combinations (~30.6 bits). Sign-in also needs
// the handle and is rate-limited, so the combination is never guessed alone.

const MATERIALS = [
  "linen", "wool", "denim", "silk", "suede", "canvas", "velvet", "cotton",
  "cashmere", "leather", "corduroy", "tweed", "satin", "mohair", "flannel",
  "chambray", "jersey", "poplin", "twill", "fleece", "alpaca", "angora",
  "boucle", "brocade", "calico", "chiffon", "crepe", "damask", "felt",
  "gauze", "gingham", "hemp", "jacquard", "khaki", "lace", "lambswool",
  "lurex", "lyocell", "madras", "melton", "merino", "mesh", "modal", "muslin",
  "nylon", "oxford", "paisley", "percale", "pique", "plaid", "raffia", "rayon",
  "ripstop", "sateen", "seersucker", "shearling", "sherpa", "taffeta",
  "terry", "tulle", "tartan", "voile", "worsted", "chenille",
];

const TONES = [
  "brass", "cobalt", "olive", "honey", "blush", "slate", "bone", "sage",
  "ochre", "indigo", "rust", "moss", "cream", "ink", "pewter", "amber",
  "plum", "teal", "clay", "ash", "coral", "copper", "cedar", "chalk",
  "charcoal", "cherry", "cocoa", "denim", "dune", "ecru", "fern", "flax",
  "ginger", "graphite", "hazel", "ivory", "jade", "juniper", "khaki", "lilac",
  "lemon", "mauve", "mint", "mustard", "navy", "oat", "onyx", "peach", "pine",
  "poppy", "putty", "quartz", "sand", "scarlet", "sienna", "smoke", "stone",
  "straw", "tan", "tawny", "umber", "violet", "wheat", "willow",
];

const CREATURES = [
  "moth", "fox", "wren", "hare", "lynx", "crane", "otter", "finch", "stoat",
  "heron", "vole", "newt", "swift", "kite", "shrew", "tern", "ibis", "lark",
  "mole", "owl", "badger", "beaver", "bison", "crow", "curlew", "deer",
  "dove", "egret", "elk", "ferret", "gecko", "goose", "gull", "hawk",
  "hedgehog", "ibex", "jay", "koala", "lemur", "llama", "loon", "magpie",
  "marten", "mink", "mouse", "newt", "orca", "osprey", "panda", "pika",
  "plover", "puffin", "quail", "raven", "robin", "seal", "shrike", "skua",
  "sloth", "snipe", "sparrow", "stork", "toad", "yak",
];

const OBJECTS = [
  "button", "hanger", "thread", "needle", "pocket", "collar", "cuff", "lapel",
  "buckle", "zipper", "ribbon", "patch", "seam", "hem", "clasp", "loop",
  "knot", "pleat", "stitch", "frill", "bobbin", "brooch", "cufflink", "dart",
  "drawer", "eyelet", "fringe", "gusset", "hook", "hood", "inseam", "label",
  "lining", "locket", "mitten", "notch", "pattern", "pin", "piping", "placket",
  "pompom", "rivet", "ruffle", "sash", "scarf", "sequin", "shank", "shelf",
  "sleeve", "snap", "spool", "strap", "tassel", "thimble", "toggle", "trunk",
  "tuck", "valet", "wardrobe", "welt", "yoke", "zip", "badge", "bow",
];

// dedupe while keeping order (a couple of words appear in two banks)
const uniq = (a: string[]) => [...new Set(a)];
const LISTS = [uniq(MATERIALS), uniq(TONES), uniq(CREATURES), uniq(OBJECTS)];

function pick<T>(arr: T[]): T {
  return arr[crypto.randomInt(arr.length)];
}

export interface Combination {
  words: string[];
  digit: number;
  /** human form: "linen · brass · moth · button · 47" */
  phrase: string;
  /** normalized (for hashing) */
  normalized: string;
  /** suggested public handle, e.g. "moth-47" — user can override */
  handle: string;
}

export function generateCombination(): Combination {
  const words = LISTS.map((l) => pick(l));
  const digit = crypto.randomInt(100);
  return assemble(words, digit);
}

export function assemble(words: string[], digit: number): Combination {
  const phrase = `${words.join(" · ")} · ${digit}`;
  const normalized = normalizeCombination(phrase);
  // suggested handle = the creature word (outward "tag", brief §24)
  const handle = words[2] ?? words[words.length - 1];
  return { words, digit, phrase, normalized, handle };
}

export function normalizeCombination(input: string): string {
  // strip separators, collapse whitespace, lowercase — order preserved
  return input
    .toLowerCase()
    .replace(/[·•,/|.\-_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// public handles: lowercase slug, 2–30 chars, a–z 0–9 and single hyphens.
export function normalizeHandle(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/^✦\s*/, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 30);
}

export function isValidHandle(input: string): boolean {
  const h = normalizeHandle(input);
  return h.length >= 2 && /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/.test(h);
}

export const WORD_BANKS = {
  materials: LISTS[0],
  tones: LISTS[1],
  creatures: LISTS[2],
  objects: LISTS[3],
};

// Strength floor for new combinations (brief §24): at least four words of
// 3+ letters, a number, and not the same word repeated.
export function combinationStrengthOk(input: string): boolean {
  const tokens = normalizeCombination(input).split(" ").filter(Boolean);
  const words = tokens.filter((t) => /^[a-z]{3,}$/.test(t));
  const hasNumber = tokens.some((t) => /^\d+$/.test(t));
  return words.length >= 4 && new Set(words).size >= 4 && hasNumber;
}

export function estimateEntropyBits(): number {
  const space = LISTS.reduce((acc, l) => acc * l.length, 1) * 100;
  return Math.round(Math.log2(space) * 10) / 10;
}

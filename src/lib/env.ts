import "server-only";

// Central place for required server configuration. In production a missing
// secret is a deploy error, not something to paper over with a dev default
// (a default pepper would make every lookup hash guessable).

const isProd = process.env.NODE_ENV === "production";
// `next build` runs with NODE_ENV=production but without runtime secrets
const isBuild = process.env.NEXT_PHASE === "phase-production-build";

function required(name: string, devDefault: string): string {
  const v = process.env[name];
  if (v) return v;
  if (isProd && !isBuild) throw new Error(`missing required env ${name}`);
  return devDefault;
}

export const env = {
  get lookupPepper() {
    return required("LOOKUP_PEPPER", "wardrobe-dev-pepper");
  },
  get rpId() {
    return required("RP_ID", "localhost");
  },
  get appOrigin() {
    return required("APP_ORIGIN", "http://localhost:3000").replace(/\/+$/, "");
  },
  // signs /api/img URLs handed to guests (falls back to the pepper)
  get signingSecret() {
    return process.env.SIGNING_SECRET || this.lookupPepper;
  },
  get cronSecret() {
    return process.env.CRON_SECRET || null;
  },
};

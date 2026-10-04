import "server-only";
import { Resend } from "resend";
import { brand } from "@/lib/brand";

/* ------------------------------------------------------------------ *
 *  wardrobe — mailer (Resend)
 *  Configure with RESEND_API_KEY and a MAIL_FROM address (a verified
 *  sender/domain in your Resend account). Without the key, sendMail
 *  throws so the calling route reports that the email did not go out.
 * ------------------------------------------------------------------ */

const API_KEY = process.env.RESEND_API_KEY;
const FROM = process.env.MAIL_FROM ?? `${brand.name} <onboarding@resend.dev>`;

export const mailerConfigured = Boolean(API_KEY);

let cached: Resend | null = null;
function client() {
  if (!cached) cached = new Resend(API_KEY);
  return cached;
}

// Resend only — no silent fallback. If it isn't configured or the send fails,
// we throw so the calling route can surface a real error instead of pretending
// the email went out.
export async function sendMail(opts: {
  to: string;
  subject: string;
  text: string;
  html?: string;
}): Promise<void> {
  if (!mailerConfigured) {
    throw new Error(
      "email isn't configured — set RESEND_API_KEY (and MAIL_FROM) in .env"
    );
  }
  const { data, error } = await client().emails.send({
    from: FROM,
    to: opts.to,
    subject: opts.subject,
    text: opts.text,
    ...(opts.html ? { html: opts.html } : {}),
  });
  if (error) {
    // Resend returns a structured error (e.g. unverified domain, bad key).
    const detail = typeof error === "string" ? error : JSON.stringify(error);
    throw new Error(`resend: ${detail}`);
  }
  console.info(`[mailer] sent to ${opts.to} (id ${data?.id ?? "?"})`);
}

/** branded recovery-code email (plain + light html). */
export function recoveryCodeEmail(handle: string, code: string) {
  const text = `your ${brand.name} reset code is ${code}

it unlocks the recovery screen for the next 15 minutes. enter it alongside a
new combination to get back in.

if this wasn't you, you can ignore this — nothing changes until the code is used.

${brand.wordmark}`;

  const html = `<div style="font-family:ui-monospace,Menlo,monospace;background:#a9c4f5;padding:32px;color:#14161b">
  <div style="max-width:440px;margin:0 auto;background:#eef2fb;border-radius:18px;padding:28px 26px;box-shadow:0 18px 40px rgba(36,54,96,.28)">
    <div style="font-size:20px;letter-spacing:-.02em">${brand.wordmark}</div>
    <p style="color:#3a4150;margin:14px 0 18px">hey ${escapeHtml(handle)} — here's the way back in.</p>
    <div style="font-size:30px;font-weight:600;letter-spacing:.18em;text-align:center;padding:18px;border:1px solid rgba(20,22,27,.42);border-radius:12px;background:rgba(169,196,245,.35)">${code}</div>
    <p style="color:#3a4150;font-size:13px;margin-top:18px">good for 15 minutes. enter it with a new combination to reset.</p>
    <p style="color:#3a4150;font-size:12px;margin-top:14px">if this wasn't you, ignore it — nothing changes until the code is used.</p>
  </div>
</div>`;

  return {
    subject: `your ${brand.name} reset code ${brand.mark}`,
    text,
    html,
  };
}

/** passwordless sign-in / sign-up magic code. */
export function magicCodeEmail(code: string) {
  const text = `your ${brand.name} sign-in code is ${code}

enter it to open your wardrobe — or to make a new one. it's good for 15 minutes.

if you didn't ask for this, you can ignore it.

${brand.wordmark}`;

  const html = `<div style="font-family:ui-monospace,Menlo,monospace;background:#a9c4f5;padding:32px;color:#14161b">
  <div style="max-width:440px;margin:0 auto;background:#eef2fb;border-radius:18px;padding:28px 26px;box-shadow:0 18px 40px rgba(36,54,96,.28)">
    <div style="font-size:20px;letter-spacing:-.02em">${brand.wordmark}</div>
    <p style="color:#3a4150;margin:14px 0 18px">here's your code — enter it to open your wardrobe, or make a new one.</p>
    <div style="font-size:30px;font-weight:600;letter-spacing:.18em;text-align:center;padding:18px;border:1px solid rgba(20,22,27,.42);border-radius:12px;background:rgba(169,196,245,.35)">${code}</div>
    <p style="color:#3a4150;font-size:13px;margin-top:18px">good for 15 minutes.</p>
    <p style="color:#3a4150;font-size:12px;margin-top:14px">if you didn't ask for this, ignore it.</p>
  </div>
</div>`;

  return { subject: `your ${brand.name} sign-in code ${brand.mark}`, text, html };
}

/** confirm-this-email code for an existing logged-in account. */
export function verifyEmailCodeEmail(code: string) {
  const text = `your ${brand.name} confirmation code is ${code}

enter it in the app to attach this email to your wardrobe — so you can sign in
and recover with it. it's good for 15 minutes.

if you didn't ask for this, you can ignore it.

${brand.wordmark}`;

  const html = `<div style="font-family:ui-monospace,Menlo,monospace;background:#a9c4f5;padding:32px;color:#14161b">
  <div style="max-width:440px;margin:0 auto;background:#eef2fb;border-radius:18px;padding:28px 26px;box-shadow:0 18px 40px rgba(36,54,96,.28)">
    <div style="font-size:20px;letter-spacing:-.02em">${brand.wordmark}</div>
    <p style="color:#3a4150;margin:14px 0 18px">confirm this email to attach it to your wardrobe.</p>
    <div style="font-size:30px;font-weight:600;letter-spacing:.18em;text-align:center;padding:18px;border:1px solid rgba(20,22,27,.42);border-radius:12px;background:rgba(169,196,245,.35)">${code}</div>
    <p style="color:#3a4150;font-size:13px;margin-top:18px">good for 15 minutes.</p>
    <p style="color:#3a4150;font-size:12px;margin-top:14px">if you didn't ask for this, ignore it.</p>
  </div>
</div>`;

  return { subject: `confirm your ${brand.name} email ${brand.mark}`, text, html };
}

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c] as string)
  );
}

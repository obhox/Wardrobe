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
      "Email isn't configured. Set RESEND_API_KEY (and MAIL_FROM) in .env."
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

// One look for every code email: the wordmark, a line of context, the code.
function codeEmail(opts: { subject: string; lead: string; code: string; after: string; ignore: string }) {
  const text = `${opts.lead}

${opts.code}

${opts.after}

${opts.ignore}

${brand.wordmark}`;

  const html = `<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;background:#faf9f6;padding:32px 16px;color:#1a1a18">
  <div style="max-width:440px;margin:0 auto;background:#ffffff;border:1px solid #e4e2dc;border-radius:16px;padding:28px 26px">
    <div style="font-family:Georgia,'Times New Roman',serif;font-size:22px">${escapeHtml(brand.wordmark)}</div>
    <p style="color:#5b5952;font-size:15px;line-height:1.5;margin:16px 0 18px">${escapeHtml(opts.lead)}</p>
    <div style="font-family:ui-monospace,Menlo,Consolas,monospace;font-size:30px;font-weight:600;letter-spacing:.18em;text-align:center;padding:18px;border-radius:10px;background:#f3f1ec">${opts.code}</div>
    <p style="color:#5b5952;font-size:14px;line-height:1.5;margin:18px 0 0">${escapeHtml(opts.after)}</p>
    <p style="color:#76736a;font-size:13px;line-height:1.5;margin:12px 0 0">${escapeHtml(opts.ignore)}</p>
  </div>
</div>`;

  return { subject: opts.subject, text, html };
}

/** reset code for someone who lost their combination. */
export function recoveryCodeEmail(handle: string, code: string) {
  return codeEmail({
    subject: `Your ${brand.name} reset code`,
    lead: `Hello ${handle}. Here is your ${brand.name} reset code.`,
    code,
    after: "It works for 15 minutes. Enter it with a new combination to get back in.",
    ignore: "If this wasn't you, ignore this email. Nothing changes until the code is used.",
  });
}

/** passwordless sign-in / sign-up code. */
export function magicCodeEmail(code: string) {
  return codeEmail({
    subject: `Your ${brand.name} sign-in code`,
    lead: `Here is your ${brand.name} sign-in code.`,
    code,
    after: "Enter it to open your wardrobe, or to create one. It works for 15 minutes.",
    ignore: "If you didn't ask for this, you can ignore this email.",
  });
}

/** confirm-this-email code for an existing signed-in account. */
export function verifyEmailCodeEmail(code: string) {
  return codeEmail({
    subject: `Confirm your ${brand.name} email`,
    lead: `Here is the code to add this email to your ${brand.name} account.`,
    code,
    after: "Enter it in the app so you can sign in and recover your account with this address. It works for 15 minutes.",
    ignore: "If you didn't ask for this, you can ignore this email.",
  });
}

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c] as string)
  );
}

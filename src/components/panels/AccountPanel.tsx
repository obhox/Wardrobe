"use client";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { startRegistration } from "@simplewebauthn/browser";
import { useStore } from "@/lib/store";
import { api } from "@/lib/api";
import { CURRENCIES } from "@/lib/currency";
import { RefreshCw } from "lucide-react";
import Dialog from "@/components/ui/Dialog";
import { Button, IconButton, buttonClass } from "@/components/ui/Button";
import { FormField, Input, Select } from "@/components/ui/Field";
import type { StudioUser } from "@/app/studio/Studio";

type Me = {
  handle: string;
  email: string | null;
  hasCombination: boolean;
  passkeys: number;
  displayCurrency: string;
};
type Passkey = { id: string; deviceLabel: string | null; createdAt: string };
type SessionRow = { id: string; userAgent: string | null; lastSeenAt: string; current: boolean };

function deviceName(ua: string | null) {
  if (!ua) return "Unknown device";
  const os = /iphone|ipad/i.test(ua) ? "iPhone" : /android/i.test(ua) ? "Android" : /mac os/i.test(ua) ? "Mac" : /windows/i.test(ua) ? "Windows" : /linux/i.test(ua) ? "Linux" : "a device";
  const browser = /edg\//i.test(ua) ? "Edge" : /chrome|crios/i.test(ua) ? "Chrome" : /firefox|fxios/i.test(ua) ? "Firefox" : /safari/i.test(ua) ? "Safari" : "A browser";
  return `${browser} on ${os}`;
}

const when = (d: string) => new Date(d).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });

export default function AccountPanel({ user }: { user: StudioUser }) {
  const router = useRouter();
  const setPanel = useStore((s) => s.setPanel);
  const reset = useStore((s) => s.reset);
  const flush = useStore((s) => s.flush);
  const toast = useStore((s) => s.toast);

  const [me, setMe] = useState<Me | null>(null);
  const [passkeys, setPasskeys] = useState<Passkey[]>([]);
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [err, setErr] = useState("");

  const load = useCallback(async () => {
    try {
      const [m, p, s] = await Promise.all([
        api.get("/api/auth/me"),
        api.get("/api/auth/passkey"),
        api.get("/api/auth/sessions"),
      ]);
      setMe(m.user);
      setPasskeys(p.passkeys);
      setSessions(s.sessions);
    } catch (e) {
      setErr((e as Error).message);
    }
  }, []);

  useEffect(() => {
    const t = setTimeout(load, 0);
    return () => clearTimeout(t);
  }, [load]);

  const close = () => setPanel(null);

  async function signOut() {
    await flush();
    await api.post("/api/auth/logout").catch(() => {});
    reset();
    router.replace("/");
    router.refresh();
  }

  async function addPasskey() {
    setErr("");
    try {
      const options = await api.post("/api/auth/passkey/register/options");
      const att = await startRegistration({ optionsJSON: options });
      await api.post("/api/auth/passkey/register/verify", { ...att, deviceLabel: deviceName(navigator.userAgent) });
      toast("Passkey added. You can sign in with it next time.");
      load();
    } catch (e) {
      const msg = (e as Error).message;
      if (!/abort|cancel|not allowed/i.test(msg)) setErr(msg);
    }
  }

  async function removePasskey(id: string) {
    try {
      await api.del(`/api/auth/passkey/${id}`);
      load();
    } catch (e) {
      setErr((e as Error).message);
    }
  }

  async function revoke(id?: string) {
    try {
      await api.del(id ? `/api/auth/sessions/${id}` : "/api/auth/sessions");
      toast(id ? "Signed that device out" : "Signed out everywhere else");
      load();
    } catch (e) {
      setErr((e as Error).message);
    }
  }

  const rowLink = "shrink-0 text-ink-soft underline underline-offset-4 hover:text-danger";

  return (
    <Dialog title="Account" variant="sheet" onClose={close}>
      <FormField label="Handle">
        <div className="flex h-10 items-center rounded-control bg-wash px-3 font-mono">@{user.handle}</div>
        <p className="mt-1.5 text-caption text-ink-soft">Your public name. You sign in with it.</p>
      </FormField>

      <EmailSection me={me} onChange={load} />

      <FormField label="Passkeys" className="mt-7">
        {passkeys.length > 0 ? (
          <ul className="mb-3 divide-y divide-rule border-y border-rule">
            {passkeys.map((p) => (
              <li key={p.id} className="flex items-center justify-between gap-3 py-2 text-caption">
                <span className="min-w-0 truncate">
                  <span className="cap-first inline-block">{p.deviceLabel ?? "Passkey"}</span>{" "}
                  <span className="text-ink-soft">· {when(p.createdAt)}</span>
                </span>
                <button onClick={() => removePasskey(p.id)} className={rowLink} aria-label={`Remove passkey ${p.deviceLabel ?? ""}`}>
                  Remove
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mb-3 text-caption text-ink-soft">
            None yet. A passkey signs you in with your face, fingerprint or device PIN, and is the quickest way back in.
          </p>
        )}
        <Button onClick={addPasskey} className="w-full">
          Add a passkey on this device
        </Button>
      </FormField>

      <CombinationSection hasCombination={!!me?.hasCombination} onDone={load} />

      <FormField label="Show totals in" htmlFor="account-currency" className="mt-7">
        <Select
          id="account-currency"
          value={me?.displayCurrency ?? user.displayCurrency}
          onChange={async (e) => {
            const displayCurrency = e.target.value;
            setMe((m) => (m ? { ...m, displayCurrency } : m));
            await api.patch("/api/auth/me", { displayCurrency }).catch(() => {});
          }}
        >
          {[...CURRENCIES.map((c) => c.code), "CAD", "AUD", "INR", "KES", "GHS", "ZAR", "BRL", "CHF", "SEK"].map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </Select>
      </FormField>

      <FormField label="Signed in on" className="mt-7">
        <ul className="divide-y divide-rule border-y border-rule">
          {sessions.map((s) => (
            <li key={s.id} className="flex items-center justify-between gap-3 py-2 text-caption">
              <span className="min-w-0 truncate">
                {deviceName(s.userAgent)}{" "}
                {s.current ? <span className="font-medium">· this device</span> : <span className="text-ink-soft">· {when(s.lastSeenAt)}</span>}
              </span>
              {!s.current && (
                <button onClick={() => revoke(s.id)} className={rowLink}>
                  Sign out
                </button>
              )}
            </li>
          ))}
        </ul>
        {sessions.length > 1 && (
          <button onClick={() => revoke()} className="mt-2.5 text-caption text-ink-soft underline underline-offset-4 hover:text-ink">
            Sign out everywhere else
          </button>
        )}
      </FormField>

      <FormField label="Your data" className="mt-7">
        <a href="/api/account/export" className={buttonClass("secondary", "md", "w-full")}>
          Download everything (JSON)
        </a>
      </FormField>

      {err && (
        <p className="cap-first mt-4 text-caption text-danger" role="alert">
          {err}
        </p>
      )}

      <div className="mt-8 border-t border-rule pt-5">
        <Button onClick={signOut} className="w-full">
          Sign out
        </Button>
      </div>

      <DeleteAccount handle={user.handle} onDeleted={() => { reset(); router.replace("/"); router.refresh(); }} />
    </Dialog>
  );
}

function EmailSection({ me, onChange }: { me: Me | null; onChange: () => void }) {
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [sent, setSent] = useState(false);
  const [note, setNote] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  async function act(fn: () => Promise<void>) {
    setBusy(true);
    setErr("");
    try {
      await fn();
    } catch (e) {
      setErr((e as Error).message);
    }
    setBusy(false);
  }

  return (
    <FormField label="Email" className="mt-7">
      {me?.email ? (
        <div className="flex h-10 items-center justify-between gap-2 rounded-control bg-wash px-3">
          <span className="min-w-0 truncate">{me.email}</span>
          <button
            onClick={() =>
              act(async () => {
                await api.del("/api/auth/email");
                setNote("Email removed.");
                onChange();
              })
            }
            className="shrink-0 text-caption text-ink-soft underline underline-offset-4 hover:text-danger"
          >
            Remove
          </button>
        </div>
      ) : (
        <p className="text-caption text-ink-soft">
          No email yet. Add one to sign in by email, recover your account and get price-drop alerts.
        </p>
      )}

      <div className="mt-3">
        {!sent ? (
          <form
            className="flex flex-col gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              act(async () => {
                await api.post("/api/auth/email/add/request", { email });
                setSent(true);
                setNote(`If ${email} can receive mail, a 6-digit code is on its way. It works for 15 minutes.`);
              });
            }}
          >
            <Input
              type="email"
              inputMode="email"
              autoComplete="email"
              aria-label={me?.email ? "New email" : "Email"}
              placeholder={me?.email ? "New email" : "you@example.com"}
              value={email}
              onChange={(e) => setEmail(e.target.value.trim())}
            />
            <Button type="submit" variant="primary" disabled={busy || email.length < 3}>
              {busy ? "Sending…" : me?.email ? "Send a code to change it" : "Send me a code"}
            </Button>
          </form>
        ) : (
          <form
            className="flex flex-col gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              act(async () => {
                await api.post("/api/auth/email/add/verify", { email, code });
                setSent(false);
                setCode("");
                setEmail("");
                setNote("Email added.");
                onChange();
              });
            }}
          >
            <Input
              inputMode="numeric"
              autoComplete="one-time-code"
              aria-label="6-digit code"
              placeholder="6-digit code"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              className="font-mono tracking-[0.3em] placeholder:tracking-normal"
            />
            <Button type="submit" variant="primary" disabled={busy || code.length < 6}>
              {busy ? "Confirming…" : "Confirm email"}
            </Button>
            <button type="button" onClick={() => setSent(false)} className="text-caption text-ink-soft underline underline-offset-4 hover:text-ink">
              Use a different email
            </button>
          </form>
        )}
      </div>
      {note && <p className="mt-2 text-caption text-ink-soft">{note}</p>}
      {err && (
        <p className="cap-first mt-2 text-caption text-danger" role="alert">
          {err}
        </p>
      )}
    </FormField>
  );
}

function CombinationSection({ hasCombination, onDone }: { hasCombination: boolean; onDone: () => void }) {
  const [open, setOpen] = useState(false);
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState<string | null>(null);
  const [err, setErr] = useState("");
  const [done, setDone] = useState("");
  const [busy, setBusy] = useState(false);

  async function roll() {
    try {
      setNext((await api.get("/api/auth/generate")).phrase);
    } catch {
      setErr("Couldn't make a combination. Try again.");
    }
  }

  async function save() {
    if (!next) return;
    setBusy(true);
    setErr("");
    try {
      await api.post("/api/auth/combination", { current: current || undefined, newPhrase: next });
      setDone(`Saved. Your combination is now: ${next}. Write it down.`);
      setOpen(false);
      setCurrent("");
      onDone();
    } catch (e) {
      setErr((e as Error).message);
    }
    setBusy(false);
  }

  return (
    <FormField label="Combination" className="mt-7">
      {!open ? (
        <>
          <p className="mb-3 text-caption text-ink-soft">
            {hasCombination
              ? "You can sign in with your handle and combination. Changing it signs out your other devices."
              : "No combination yet. Add one as another way to sign in."}
          </p>
          <Button
            onClick={() => {
              setOpen(true);
              setDone("");
              roll();
            }}
            className="w-full"
          >
            {hasCombination ? "Change combination" : "Set a combination"}
          </Button>
        </>
      ) : (
        <div className="flex flex-col gap-2">
          {hasCombination && (
            <Input aria-label="Current combination" placeholder="Current combination" value={current} onChange={(e) => setCurrent(e.target.value)} autoComplete="current-password" />
          )}
          <div className="flex items-center gap-2">
            <div className="flex min-h-10 flex-1 items-center rounded-control bg-wash px-3 py-2 font-mono text-caption" aria-live="polite">
              {next ?? "…"}
            </div>
            <IconButton label="Make a different one" variant="secondary" onClick={roll}>
              <RefreshCw aria-hidden className="h-4 w-4" />
            </IconButton>
          </div>
          <Button variant="primary" onClick={save} disabled={busy || !next || (hasCombination && current.length < 3)}>
            {busy ? "Saving…" : "Use this combination"}
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setOpen(false)}>
            Cancel
          </Button>
        </div>
      )}
      {done && <p className="mt-2 break-words text-caption">{done}</p>}
      {err && (
        <p className="cap-first mt-2 text-caption text-danger" role="alert">
          {err}
        </p>
      )}
    </FormField>
  );
}

function DeleteAccount({ handle, onDeleted }: { handle: string; onDeleted: () => void }) {
  const [open, setOpen] = useState(false);
  const [confirm, setConfirm] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  return (
    <div className="mt-6">
      {!open ? (
        <button onClick={() => setOpen(true)} className="text-caption text-ink-soft underline underline-offset-4 hover:text-danger">
          Delete my account…
        </button>
      ) : (
        <div className="rounded-card border border-danger bg-danger-wash p-3.5">
          <p className="text-caption">
            This deletes every wardrobe, item and photo for good. Type <b>{handle}</b> to confirm.
          </p>
          <Input aria-label="Type your handle to confirm" value={confirm} onChange={(e) => setConfirm(e.target.value)} className="mt-2.5" />
          <div className="mt-2.5 flex gap-2">
            <Button
              variant="danger"
              className="flex-1"
              disabled={busy || confirm.trim().toLowerCase() !== handle}
              onClick={async () => {
                setBusy(true);
                try {
                  await api.del("/api/account", { confirm });
                  onDeleted();
                } catch (e) {
                  setErr((e as Error).message);
                  setBusy(false);
                }
              }}
            >
              {busy ? "Deleting…" : "Delete for good"}
            </Button>
            <Button onClick={() => setOpen(false)}>Keep it</Button>
          </div>
          {err && (
            <p className="cap-first mt-2 text-caption text-danger" role="alert">
              {err}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

"use client";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { startRegistration } from "@simplewebauthn/browser";
import { useStore } from "@/lib/store";
import { api } from "@/lib/api";
import { CURRENCIES } from "@/lib/currency";
import Dialog, { SheetHeader } from "@/components/ui/Dialog";
import { Field, Group, PrimaryButton, QuietButton } from "@/components/ui/controls";
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
  if (!ua) return "unknown device";
  const os = /iphone|ipad/i.test(ua) ? "iphone" : /android/i.test(ua) ? "android" : /mac os/i.test(ua) ? "mac" : /windows/i.test(ua) ? "windows" : /linux/i.test(ua) ? "linux" : "device";
  const browser = /edg\//i.test(ua) ? "edge" : /chrome|crios/i.test(ua) ? "chrome" : /firefox|fxios/i.test(ua) ? "firefox" : /safari/i.test(ua) ? "safari" : "browser";
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
      toast("passkey added ✦ — you can unlock with it next time");
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
      toast(id ? "signed that device out" : "signed out everywhere else");
      load();
    } catch (e) {
      setErr((e as Error).message);
    }
  }

  return (
    <Dialog title="account" variant="sheet" onClose={close} labelledBy="account-title">
      <SheetHeader id="account-title" title="account" onClose={close} />

      <Group label="your handle — the public name on your tag">
        <div className="rounded-lg border border-rule bg-ground/40 px-3 py-2.5 text-[15px] lowercase">✦ {user.handle}</div>
      </Group>

      <EmailSection me={me} onChange={load} />

      <Group label="passkeys — unlock with face, fingerprint or device">
        {passkeys.length > 0 ? (
          <ul className="mb-2 space-y-1">
            {passkeys.map((p) => (
              <li key={p.id} className="flex items-center justify-between gap-2 rounded-lg border border-rule px-3 py-2 text-xs lowercase">
                <span className="min-w-0 truncate">
                  {p.deviceLabel ?? "passkey"} <span className="text-ink-soft">· {when(p.createdAt)}</span>
                </span>
                <button onClick={() => removePasskey(p.id)} className="shrink-0 text-ink-soft hover:text-blush" aria-label={`remove passkey ${p.deviceLabel ?? ""}`}>
                  remove
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mb-2 text-[11px] lowercase text-ink-soft">none yet. the fastest way back in on this device.</p>
        )}
        <QuietButton onClick={addPasskey} className="w-full">+ add a passkey on this device</QuietButton>
      </Group>

      <CombinationSection hasCombination={!!me?.hasCombination} onDone={load} />

      <Group label="totals shown in">
        <select
          aria-label="display currency"
          value={me?.displayCurrency ?? user.displayCurrency}
          onChange={async (e) => {
            const displayCurrency = e.target.value;
            setMe((m) => (m ? { ...m, displayCurrency } : m));
            await api.patch("/api/auth/me", { displayCurrency }).catch(() => {});
          }}
          className="w-full rounded-lg border border-rule bg-ground/40 px-3 py-2 text-base lowercase outline-none focus:border-ink sm:text-sm"
        >
          {[...CURRENCIES.map((c) => c.code), "CAD", "AUD", "INR", "KES", "GHS", "ZAR", "BRL", "CHF", "SEK"].map((c) => (
            <option key={c} value={c}>{c.toLowerCase()}</option>
          ))}
        </select>
      </Group>

      <Group label="signed in on">
        <ul className="space-y-1">
          {sessions.map((s) => (
            <li key={s.id} className="flex items-center justify-between gap-2 text-xs lowercase">
              <span className="min-w-0 truncate">
                {deviceName(s.userAgent)} {s.current ? <b>· this one</b> : <span className="text-ink-soft">· {when(s.lastSeenAt)}</span>}
              </span>
              {!s.current && (
                <button onClick={() => revoke(s.id)} className="shrink-0 text-ink-soft hover:text-blush">
                  sign out
                </button>
              )}
            </li>
          ))}
        </ul>
        {sessions.length > 1 && (
          <button onClick={() => revoke()} className="mt-2 text-[11px] lowercase text-ink-soft underline underline-offset-4 hover:text-ink">
            sign out everywhere else
          </button>
        )}
      </Group>

      <Group label="your data">
        <a
          href="/api/account/export"
          className="block rounded-xl border border-rule px-4 py-2.5 text-center text-sm lowercase hover:bg-ink/5"
        >
          download everything (.json)
        </a>
      </Group>

      {err && <p className="mt-4 text-xs lowercase text-blush" role="alert">{err}</p>}

      <div className="mt-8 border-t border-rule pt-5">
        <QuietButton onClick={signOut} className="w-full">sign out</QuietButton>
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
    <Group label="email">
      {me?.email ? (
        <div className="flex items-center justify-between gap-2 rounded-lg border border-rule bg-ground/40 px-3 py-2.5 text-[15px] lowercase">
          <span className="min-w-0 truncate">{me.email}</span>
          <button
            onClick={() =>
              act(async () => {
                await api.del("/api/auth/email");
                setNote("email removed.");
                onChange();
              })
            }
            className="shrink-0 text-xs text-ink-soft hover:text-blush"
          >
            remove
          </button>
        </div>
      ) : (
        <p className="text-[11px] lowercase text-ink-soft">
          no email yet. add one to sign in by email, recover your wardrobe, and get price-drop alerts.
        </p>
      )}

      <div className="mt-3 flex flex-col gap-2">
        {!sent ? (
          <form
            className="flex flex-col gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              act(async () => {
                await api.post("/api/auth/email/add/request", { email });
                setSent(true);
                setNote(`if ${email} can receive mail, a 6-digit code is on its way. it's good for 15 minutes.`);
              });
            }}
          >
            <Field
              type="email"
              inputMode="email"
              autoComplete="email"
              aria-label={me?.email ? "new email" : "email"}
              placeholder={me?.email ? "new email" : "you@example.com"}
              value={email}
              onChange={(e) => setEmail(e.target.value.trim())}
            />
            <PrimaryButton type="submit" disabled={busy || email.length < 3}>
              {busy ? "sending…" : me?.email ? "send code to change" : "send me a code ✦"}
            </PrimaryButton>
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
                setNote("email attached ✦");
                onChange();
              });
            }}
          >
            <Field
              inputMode="numeric"
              autoComplete="one-time-code"
              aria-label="6-digit code"
              placeholder="• • • • • •"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              className="tracking-[0.3em]"
            />
            <PrimaryButton type="submit" disabled={busy || code.length < 6}>
              {busy ? "confirming…" : "confirm email ✦"}
            </PrimaryButton>
            <button type="button" onClick={() => setSent(false)} className="text-xs lowercase text-ink-soft underline underline-offset-4">
              use a different email
            </button>
          </form>
        )}
      </div>
      {note && <p className="mt-2 text-xs lowercase text-ink-soft">{note}</p>}
      {err && <p className="mt-2 text-xs lowercase text-blush" role="alert">{err}</p>}
    </Group>
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
      setErr("couldn't make a combination — try again");
    }
  }

  async function save() {
    if (!next) return;
    setBusy(true);
    setErr("");
    try {
      await api.post("/api/auth/combination", { current: current || undefined, newPhrase: next });
      setDone(`saved. your combination is now: ${next} — write it down.`);
      setOpen(false);
      setCurrent("");
      onDone();
    } catch (e) {
      setErr((e as Error).message);
    }
    setBusy(false);
  }

  return (
    <Group label="combination">
      {!open ? (
        <>
          <p className="mb-2 text-[11px] lowercase text-ink-soft">
            {hasCombination
              ? "sign in with your handle + combination. changing it signs out your other devices."
              : "no combination yet — add one as another way in."}
          </p>
          <QuietButton
            onClick={() => {
              setOpen(true);
              setDone("");
              roll();
            }}
            className="w-full"
          >
            {hasCombination ? "change combination" : "set a combination"}
          </QuietButton>
        </>
      ) : (
        <div className="flex flex-col gap-2">
          {hasCombination && (
            <Field aria-label="current combination" placeholder="current combination" value={current} onChange={(e) => setCurrent(e.target.value)} autoComplete="current-password" />
          )}
          <div className="flex items-center gap-2">
            <div className="flex-1 rounded-lg border border-rule bg-ground/40 px-3 py-2.5 font-[family-name:var(--font-display)] text-[13px]" aria-live="polite">
              {next ?? "…"}
            </div>
            <button onClick={roll} aria-label="reroll" className="rounded-lg border border-rule px-3 py-2.5 text-sm hover:bg-ink/5">
              ↻
            </button>
          </div>
          <PrimaryButton onClick={save} disabled={busy || !next || (hasCombination && current.length < 3)}>
            {busy ? "setting…" : "use this combination"}
          </PrimaryButton>
          <button onClick={() => setOpen(false)} className="text-xs lowercase text-ink-soft underline underline-offset-4">
            cancel
          </button>
        </div>
      )}
      {done && <p className="mt-2 break-words text-xs lowercase text-ink">{done}</p>}
      {err && <p className="mt-2 text-xs lowercase text-blush" role="alert">{err}</p>}
    </Group>
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
        <button onClick={() => setOpen(true)} className="text-[11px] lowercase text-ink-soft underline underline-offset-4 hover:text-blush">
          delete my account…
        </button>
      ) : (
        <div className="rounded-xl border border-blush/60 p-3">
          <p className="text-xs lowercase">
            this deletes every wardrobe, item and photo for good. type <b>{handle}</b> to confirm.
          </p>
          <Field aria-label="type your handle to confirm" value={confirm} onChange={(e) => setConfirm(e.target.value)} className="mt-2" />
          <div className="mt-2 flex gap-2">
            <button
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
              className="flex-1 rounded-lg bg-blush px-3 py-2 text-xs lowercase text-white disabled:opacity-40"
            >
              {busy ? "deleting…" : "delete forever"}
            </button>
            <button onClick={() => setOpen(false)} className="rounded-lg border border-rule px-3 py-2 text-xs lowercase">
              keep it
            </button>
          </div>
          {err && <p className="mt-2 text-xs lowercase text-blush" role="alert">{err}</p>}
        </div>
      )}
    </div>
  );
}

"use client";
import { useCallback, useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, RefreshCw } from "lucide-react";
import { startAuthentication } from "@simplewebauthn/browser";
import { api } from "@/lib/api";
import { track } from "@/lib/analytics";
import { brand } from "@/lib/brand";
import { Button, IconButton } from "@/components/ui/Button";
import { FormField, Input } from "@/components/ui/Field";

type Mode = "home" | "email" | "login" | "create" | "recover";

// The sign-in card: email code, handle + combination, passkey, and recovery.
export default function CombinationLock() {
  const [mode, setMode] = useState<Mode>("home");
  // a full page load (not a client-side route change) so the studio's own
  // security policy applies — it allows what in-browser background removal needs
  const enter = () => window.location.assign("/studio");

  return (
    <div className="w-full max-w-md">
      <motion.div layout className="rounded-sheet border border-rule bg-panel px-6 py-8 shadow-card sm:px-8">
        <div className="text-center">
          <div className="font-display text-display">{brand.name}</div>
          <p className="mt-1 text-ink-soft">{brand.tagline}</p>
        </div>

        <AnimatePresence mode="wait">
          {mode === "home" && <Home key="home" setMode={setMode} />}
          {mode === "email" && <EmailMagic key="email" setMode={setMode} onDone={enter} />}
          {mode === "login" && <Login key="login" setMode={setMode} onDone={enter} />}
          {mode === "create" && <Create key="create" setMode={setMode} onDone={enter} />}
          {mode === "recover" && <Recover key="recover" setMode={setMode} onDone={enter} />}
        </AnimatePresence>
      </motion.div>

      <p className="mt-4 text-center text-caption text-ink-soft">
        Share your <b>handle</b>, never your <b>combination</b>.
      </p>
    </div>
  );
}

const fade = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
};

function Problem({ children }: { children: string }) {
  if (!children) return null;
  return (
    <p className="cap-first text-caption text-danger" role="alert">
      {children}
    </p>
  );
}

// a generated combination, with a button to make another
function Phrase({ value, onReroll }: { value: string | null | undefined; onReroll: () => void }) {
  return (
    <div className="flex items-center gap-2">
      <div aria-live="polite" className="flex min-h-10 flex-1 items-center rounded-control bg-wash px-3 py-2 font-mono text-sm">
        {value || "…"}
      </div>
      <IconButton label="Make a different one" variant="secondary" onClick={onReroll}>
        <RefreshCw aria-hidden className="h-4 w-4" />
      </IconButton>
    </div>
  );
}

function Home({ setMode }: { setMode: (m: Mode) => void }) {
  return (
    <motion.div {...fade} className="mt-7 flex flex-col gap-3">
      <Button variant="primary" size="lg" onClick={() => setMode("email")}>
        Continue with email
      </Button>

      <div className="label-caps my-1 flex items-center gap-3 text-ink-faint">
        <span className="h-px flex-1 bg-rule" />
        or use a combination
        <span className="h-px flex-1 bg-rule" />
      </div>

      <Button size="lg" onClick={() => setMode("login")}>
        Sign in with a combination
      </Button>
      <Button size="lg" onClick={() => setMode("create")}>
        Create an account with one
      </Button>
      <button onClick={() => setMode("recover")} className="mt-1 text-caption text-ink-soft underline underline-offset-4 hover:text-ink">
        Lost your combination?
      </button>
    </motion.div>
  );
}

function EmailMagic({ setMode, onDone }: { setMode: (m: Mode) => void; onDone: () => void }) {
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [sent, setSent] = useState(false);
  const [note, setNote] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  async function requestCode() {
    setBusy(true);
    setErr("");
    setNote("");
    try {
      await api.post("/api/auth/email/request", { email });
      setSent(true);
      setNote(`We sent a 6-digit code to ${email}. It works for 15 minutes.`);
    } catch (e) {
      setErr((e as Error).message);
    }
    setBusy(false);
  }

  async function verify() {
    setBusy(true);
    setErr("");
    try {
      await api.post("/api/auth/email/verify", { email, code });
      onDone();
    } catch (e) {
      setErr((e as Error).message);
      setBusy(false);
    }
  }

  return (
    <motion.div {...fade} className="mt-7 flex flex-col gap-3">
      <FormField label="Email" htmlFor="email-address">
        <Input
          id="email-address"
          type="email"
          inputMode="email"
          autoComplete="email"
          autoFocus
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value.trim())}
          onKeyDown={(e) => e.key === "Enter" && !sent && email && requestCode()}
        />
      </FormField>

      {!sent ? (
        <Button variant="primary" size="lg" disabled={busy || email.length < 3} onClick={requestCode}>
          {busy ? "Sending…" : "Email me a code"}
        </Button>
      ) : (
        <>
          <FormField label="6-digit code" htmlFor="email-code">
            <Input
              id="email-code"
              inputMode="numeric"
              autoComplete="one-time-code"
              autoFocus
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              onKeyDown={(e) => e.key === "Enter" && code.length === 6 && verify()}
              className="font-mono tracking-[0.3em]"
            />
          </FormField>
          <Button variant="primary" size="lg" disabled={busy || code.length < 6} onClick={verify}>
            {busy ? "Opening…" : "Open my wardrobe"}
          </Button>
          <button onClick={requestCode} disabled={busy} className="text-caption text-ink-soft underline underline-offset-4 hover:text-ink disabled:opacity-40">
            Resend the code
          </button>
        </>
      )}

      {note && <p className="text-caption text-ink-soft">{note}</p>}
      <p className="text-caption text-ink-faint">
        New here? This creates your wardrobe. Already have one on this email? This opens it.
      </p>
      <Problem>{err}</Problem>
      <BackRow setMode={setMode} />
    </motion.div>
  );
}

function Login({ setMode, onDone }: { setMode: (m: Mode) => void; onDone: () => void }) {
  const [handle, setHandle] = useState("");
  const [phrase, setPhrase] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit() {
    setBusy(true);
    setErr("");
    try {
      await api.post("/api/auth/login", { handle, phrase });
      onDone();
    } catch (e) {
      setErr((e as Error).message);
      setBusy(false);
    }
  }

  async function passkey() {
    setBusy(true);
    setErr("");
    try {
      const options = await api.post("/api/auth/passkey/auth/options");
      const assertion = await startAuthentication({ optionsJSON: options });
      await api.post("/api/auth/passkey/auth/verify", assertion);
      onDone();
    } catch (e) {
      const msg = (e as Error).message || "";
      setErr(/abort|cancel|not allowed/i.test(msg) ? "Passkey cancelled." : msg || "The passkey didn't work.");
      setBusy(false);
    }
  }

  return (
    <motion.form
      {...fade}
      className="mt-7 flex flex-col gap-3"
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
    >
      <FormField label="Handle" htmlFor="login-handle">
        <Input
          id="login-handle"
          autoFocus
          autoComplete="username"
          autoCapitalize="none"
          placeholder="moth"
          value={handle}
          onChange={(e) => setHandle(e.target.value)}
        />
      </FormField>
      <FormField label="Combination" htmlFor="login-phrase">
        <Input
          id="login-phrase"
          type="password"
          autoComplete="current-password"
          placeholder="linen · brass · moth · button · 47"
          value={phrase}
          onChange={(e) => setPhrase(e.target.value)}
        />
      </FormField>
      <Problem>{err}</Problem>
      <Button type="submit" variant="primary" size="lg" disabled={busy || handle.trim().length < 2 || phrase.trim().length < 3}>
        {busy ? "Signing in…" : "Sign in"}
      </Button>
      <Button onClick={passkey} disabled={busy}>
        Use a passkey instead
      </Button>
      <BackRow setMode={setMode} />
    </motion.form>
  );
}

function Create({ setMode, onDone }: { setMode: (m: Mode) => void; onDone: () => void }) {
  const [combo, setCombo] = useState<{ phrase: string; handle: string } | null>(null);
  const [handle, setHandle] = useState("");
  const [handleTouched, setHandleTouched] = useState(false);
  const [saved, setSaved] = useState(false);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  const roll = useCallback(async (keepHandle: boolean) => {
    try {
      const c = await api.get("/api/auth/generate");
      setCombo({ phrase: c.phrase, handle: c.handle });
      setSaved(false);
      // only seed the suggested handle until the user makes it their own
      if (!keepHandle) setHandle(`${c.handle}-${c.digit}`);
      setErr("");
    } catch {
      setErr("Couldn't make a combination. Check your connection and try another.");
    }
  }, []);

  useEffect(() => {
    const t = setTimeout(() => roll(false), 0);
    return () => clearTimeout(t);
  }, [roll]);

  async function create() {
    if (!combo) return;
    setBusy(true);
    setErr("");
    try {
      await api.post("/api/auth/register", { phrase: combo.phrase, handle });
      track("account_created", { method: "combination" });
      onDone();
    } catch (e) {
      setErr((e as Error).message);
      setBusy(false);
    }
  }

  return (
    <motion.div {...fade} className="mt-7 flex flex-col gap-3">
      <FormField label="Your combination">
        <Phrase value={combo?.phrase} onReroll={() => roll(handleTouched)} />
        <p className="mt-1.5 text-caption text-ink-soft">This is your password. Make another until you like it.</p>
      </FormField>
      <FormField label="Handle" htmlFor="create-handle">
        <Input
          id="create-handle"
          autoCapitalize="none"
          autoComplete="username"
          placeholder="moth-7"
          value={handle}
          onChange={(e) => {
            setHandleTouched(true);
            setHandle(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""));
          }}
        />
        <p className="mt-1.5 text-caption text-ink-soft">Your public name. You sign in with it.</p>
      </FormField>

      <label className="mt-1 flex cursor-pointer items-start gap-2.5 text-caption text-ink-soft">
        <input type="checkbox" checked={saved} onChange={(e) => setSaved(e.target.checked)} className="mt-0.5 h-4 w-4 shrink-0 accent-[var(--ink)]" />
        <span>
          I&apos;ve saved my handle and combination somewhere safe. You can add an email or a passkey as a spare key from
          your account.
        </span>
      </label>

      <Problem>{err}</Problem>
      <Button variant="primary" size="lg" disabled={busy || !combo || handle.trim().length < 2 || !saved} onClick={create}>
        {busy ? "Creating…" : "Create my wardrobe"}
      </Button>
      <BackRow setMode={setMode} />
    </motion.div>
  );
}

function Recover({ setMode, onDone }: { setMode: (m: Mode) => void; onDone: () => void }) {
  const [handle, setHandle] = useState("");
  const [code, setCode] = useState("");
  const [emailSent, setEmailSent] = useState(false);
  const [newPhrase, setNewPhrase] = useState("");
  const [note, setNote] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  async function rollNew() {
    try {
      setNewPhrase((await api.get("/api/auth/generate")).phrase);
    } catch {
      setErr("Couldn't make a combination. Try again.");
    }
  }

  // email a reset code to the address on file — the only way back in
  async function emailCode() {
    setBusy(true);
    setErr("");
    setNote("");
    try {
      await api.post("/api/auth/recover/request", { handle });
      setEmailSent(true);
      if (!newPhrase) rollNew();
      setNote("If there is an email on that account, a reset code is on its way. It works for 15 minutes.");
    } catch (e) {
      setErr((e as Error).message);
    }
    setBusy(false);
  }

  async function reset() {
    setBusy(true);
    setErr("");
    try {
      await api.post("/api/auth/recover", {
        handle,
        emailCode: code.trim(),
        newPhrase,
      });
      onDone();
    } catch (e) {
      setErr((e as Error).message);
      setBusy(false);
    }
  }

  return (
    <motion.div {...fade} className="mt-7 flex flex-col gap-3">
      <FormField label="Handle" htmlFor="recover-handle">
        <Input
          id="recover-handle"
          autoCapitalize="none"
          placeholder="moth"
          value={handle}
          onChange={(e) => setHandle(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handle && emailCode()}
        />
      </FormField>

      <Button variant={emailSent ? "secondary" : "primary"} size="lg" onClick={emailCode} disabled={busy || !handle}>
        {busy && !emailSent ? "Sending…" : emailSent ? "Resend the code" : "Email me a reset code"}
      </Button>

      {emailSent && (
        <>
          <FormField label="6-digit code from your email" htmlFor="recover-code">
            <Input
              id="recover-code"
              inputMode="numeric"
              autoComplete="one-time-code"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              className="font-mono tracking-[0.3em]"
            />
          </FormField>
          <FormField label="Your new combination">
            <Phrase value={newPhrase} onReroll={rollNew} />
            <p className="mt-1.5 text-caption text-ink-soft">Write it down before you continue.</p>
          </FormField>
          <Button variant="primary" size="lg" disabled={busy || code.length < 6 || newPhrase.trim().length < 3} onClick={reset}>
            {busy ? "Saving…" : "Set new combination"}
          </Button>
        </>
      )}

      {note && <p className="text-caption text-ink-soft">{note}</p>}
      <p className="text-caption text-ink-faint">
        No email on your account? Then it can&apos;t be recovered. That is the trade for staying email-free.
      </p>

      <Problem>{err}</Problem>
      <BackRow setMode={setMode} />
    </motion.div>
  );
}

function BackRow({ setMode }: { setMode: (m: Mode) => void }) {
  return (
    <button
      type="button"
      onClick={() => setMode("home")}
      className="mt-1 inline-flex items-center justify-center gap-1 text-caption text-ink-soft hover:text-ink"
    >
      <ArrowLeft aria-hidden className="h-3.5 w-3.5" /> Back
    </button>
  );
}

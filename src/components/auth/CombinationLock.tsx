"use client";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { startAuthentication } from "@simplewebauthn/browser";
import { api } from "@/lib/api";
import { track } from "@/lib/analytics";

type Mode = "home" | "email" | "login" | "create" | "recover";

export default function CombinationLock() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("home");

  return (
    <div className="w-full max-w-md">
      {/* luggage tag */}
      <motion.div
        layout
        className="relative rounded-2xl border border-rule bg-panel/80 backdrop-blur px-7 py-8 shadow-[0_18px_40px_var(--shadow)]"
      >
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 h-6 w-6 rounded-full border border-rule bg-ground" />
        <div className="text-center">
          <div className="font-[family-name:var(--font-display)] text-3xl tracking-tight lowercase">
            ✦ wardrobe
          </div>
          <p className="mt-1 text-sm text-ink-soft lowercase">
            your closet, made beautiful.
          </p>
        </div>

        <AnimatePresence mode="wait">
          {mode === "home" && <Home key="home" setMode={setMode} />}
          {mode === "email" && <EmailMagic key="email" setMode={setMode} onDone={() => router.push("/studio")} />}
          {mode === "login" && <Login key="login" setMode={setMode} onDone={() => router.push("/studio")} />}
          {mode === "create" && <Create key="create" setMode={setMode} onDone={() => router.push("/studio")} />}
          {mode === "recover" && <Recover key="recover" setMode={setMode} onDone={() => router.push("/studio")} />}
        </AnimatePresence>
      </motion.div>

      <p className="mt-4 text-center text-xs text-ink-soft lowercase">
        share your <b>handle</b>, never your <b>combination</b>.
      </p>
    </div>
  );
}

const fade = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
};

function Home({ setMode }: { setMode: (m: Mode) => void }) {
  return (
    <motion.div {...fade} className="mt-7 flex flex-col gap-3">
      <button
        onClick={() => setMode("email")}
        className="rounded-xl bg-ink py-3 text-[15px] lowercase text-panel transition hover:opacity-90"
      >
        continue with email ✦
      </button>

      <div className="my-1 flex items-center gap-3 text-[11px] lowercase text-ink-soft">
        <span className="h-px flex-1 bg-rule" />
        or use a combination
        <span className="h-px flex-1 bg-rule" />
      </div>

      <button
        onClick={() => setMode("login")}
        className="rounded-xl border border-rule py-3 text-[15px] lowercase transition hover:bg-ink/5"
      >
        open with a combination
      </button>
      <button
        onClick={() => setMode("create")}
        className="rounded-xl border border-rule py-3 text-[15px] lowercase transition hover:bg-ink/5"
      >
        make one with a combination
      </button>
      <button
        onClick={() => setMode("recover")}
        className="mt-1 text-xs lowercase text-ink-soft underline underline-offset-4"
      >
        lost your combination?
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
      setNote(`we sent a 6-digit code to ${email}. it's good for 15 minutes.`);
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
      <label className="text-xs lowercase text-ink-soft">your email</label>
      <Field
        type="email"
        inputMode="email"
        autoComplete="email"
        autoFocus
        placeholder="you@example.com"
        value={email}
        onChange={(e) => setEmail(e.target.value.trim())}
        onKeyDown={(e) => e.key === "Enter" && !sent && email && requestCode()}
        className="lowercase"
      />

      {!sent ? (
        <button
          disabled={busy || email.length < 3}
          onClick={requestCode}
          className="rounded-xl bg-ink py-3 text-[15px] lowercase text-panel transition hover:opacity-90 disabled:opacity-40"
        >
          {busy ? "sending…" : "email me a code ✦"}
        </button>
      ) : (
        <>
          <label className="text-xs lowercase text-ink-soft">enter the 6-digit code</label>
          <Field
            inputMode="numeric"
            autoComplete="one-time-code"
            autoFocus
            placeholder="• • • • • •"
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
            onKeyDown={(e) => e.key === "Enter" && code.length === 6 && verify()}
            className="tracking-[0.3em]"
          />
          <button
            disabled={busy || code.length < 6}
            onClick={verify}
            className="rounded-xl bg-ink py-3 text-[15px] lowercase text-panel transition hover:opacity-90 disabled:opacity-40"
          >
            {busy ? "opening…" : "open my wardrobe ✦"}
          </button>
          <button
            onClick={requestCode}
            disabled={busy}
            className="text-xs lowercase text-ink-soft underline underline-offset-4 disabled:opacity-40"
          >
            resend the code
          </button>
        </>
      )}

      {note && <p className="text-xs lowercase text-ink-soft">{note}</p>}
      <p className="text-[11px] lowercase text-ink-soft">
        new here? this makes your wardrobe. already have one on this email? it opens it.
      </p>
      {err && <p className="text-xs text-blush lowercase" role="alert">{err}</p>}
      <BackRow setMode={setMode} />
    </motion.div>
  );
}

function Field(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={
        "w-full rounded-lg border border-rule bg-ground/40 px-3 py-2.5 text-[15px] lowercase outline-none placeholder:text-ink-soft/60 focus:border-ink " +
        (props.className ?? "")
      }
    />
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
      setErr(/abort|cancel|not allowed/i.test(msg) ? "passkey cancelled" : msg || "passkey didn't work");
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
      <label htmlFor="login-handle" className="text-xs lowercase text-ink-soft">your handle</label>
      <Field
        id="login-handle"
        autoFocus
        autoComplete="username"
        autoCapitalize="none"
        placeholder="moth"
        value={handle}
        onChange={(e) => setHandle(e.target.value)}
      />
      <label htmlFor="login-phrase" className="text-xs lowercase text-ink-soft">turn your combination</label>
      <Field
        id="login-phrase"
        type="password"
        autoComplete="current-password"
        placeholder="linen · brass · moth · button · 47"
        value={phrase}
        onChange={(e) => setPhrase(e.target.value)}
      />
      {err && <p className="text-xs text-blush lowercase" role="alert">{err}</p>}
      <button
        type="submit"
        disabled={busy || handle.trim().length < 2 || phrase.trim().length < 3}
        className="rounded-xl bg-ink py-3 text-[15px] lowercase text-panel transition hover:opacity-90 disabled:opacity-40"
      >
        {busy ? "turning…" : "unlock ✦"}
      </button>
      <button
        type="button"
        onClick={passkey}
        disabled={busy}
        className="rounded-xl border border-rule py-2.5 text-[13px] lowercase transition hover:bg-ink/5"
      >
        use a passkey instead
      </button>
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
      setErr("couldn't reach wardrobe to make a combination — check your connection and reroll.");
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
      <span className="text-xs lowercase text-ink-soft">your combination — reroll until it feels yours</span>
      <div className="flex items-center gap-2">
        <div
          aria-live="polite"
          className="flex-1 rounded-lg border border-rule bg-ground/40 px-3 py-3 font-[family-name:var(--font-display)] text-[14px]"
        >
          {combo?.phrase ?? "…"}
        </div>
        <button
          onClick={() => roll(handleTouched)}
          className="rounded-lg border border-rule px-3 py-3 text-sm lowercase transition hover:bg-ink/5"
          aria-label="reroll"
        >
          ↻
        </button>
      </div>
      <label htmlFor="create-handle" className="mt-1 text-xs lowercase text-ink-soft">
        pick your handle — your public name (you sign in with it)
      </label>
      <div className="flex items-center gap-2">
        <span className="text-ink-soft" aria-hidden>✦</span>
        <Field
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
      </div>

      <label className="mt-1 flex cursor-pointer items-start gap-2 text-[12px] lowercase text-ink-soft">
        <input type="checkbox" checked={saved} onChange={(e) => setSaved(e.target.checked)} className="mt-0.5" />
        <span>i&apos;ve saved my handle and combination somewhere safe. you can add an email or a passkey as a spare key from your account.</span>
      </label>

      {err && <p className="text-xs text-blush lowercase" role="alert">{err}</p>}
      <button
        disabled={busy || !combo || handle.trim().length < 2 || !saved}
        onClick={create}
        className="rounded-xl bg-ink py-3 text-[15px] lowercase text-panel transition hover:opacity-90 disabled:opacity-40"
      >
        {busy ? "setting the lock…" : "this is mine ✦"}
      </button>
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

  async function rollNew() {
    try {
      setNewPhrase((await api.get("/api/auth/generate")).phrase);
    } catch {
      setErr("couldn't make a combination — try again");
    }
  }
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  // email a reset code to the address on file — the only way back in
  async function emailCode() {
    setBusy(true);
    setErr("");
    setNote("");
    try {
      await api.post("/api/auth/recover/request", { handle });
      setEmailSent(true);
      if (!newPhrase) rollNew();
      setNote("if an email is on file, a reset code is on its way. it's good for 15 minutes.");
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
      <label className="text-xs lowercase text-ink-soft">your handle</label>
      <Field
        placeholder="moth"
        value={handle}
        onChange={(e) => setHandle(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && handle && emailCode()}
      />

      <button
        onClick={emailCode}
        disabled={busy || !handle}
        className="rounded-xl bg-ink py-3 text-[15px] lowercase text-panel transition hover:opacity-90 disabled:opacity-40"
      >
        {busy && !emailSent ? "sending…" : emailSent ? "resend code" : "email me a reset code ✦"}
      </button>

      {emailSent && (
        <>
          <div className="flex flex-col gap-1">
            <span className="text-xs lowercase text-ink-soft">enter the 6-digit code from your email</span>
            <Field
              inputMode="numeric"
              autoComplete="one-time-code"
              placeholder="• • • • • •"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              className="tracking-[0.3em]"
            />
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-xs lowercase text-ink-soft">your new combination — write it down</span>
            <div className="flex items-center gap-2">
              <div aria-live="polite" className="flex-1 rounded-lg border border-rule bg-ground/40 px-3 py-2.5 font-[family-name:var(--font-display)] text-[13px]">
                {newPhrase || "…"}
              </div>
              <button onClick={rollNew} aria-label="reroll" className="rounded-lg border border-rule px-3 py-2.5 text-sm hover:bg-ink/5">
                ↻
              </button>
            </div>
          </div>
          <button
            disabled={busy || code.length < 6 || newPhrase.trim().length < 3}
            onClick={reset}
            className="rounded-xl bg-ink py-3 text-[15px] lowercase text-panel transition hover:opacity-90 disabled:opacity-40"
          >
            {busy ? "recovering…" : "set new combination ✦"}
          </button>
        </>
      )}

      {note && <p className="text-xs lowercase text-ink-soft">{note}</p>}
      <p className="text-[11px] lowercase text-ink-soft">
        no email on your account? it can&apos;t be recovered — that&apos;s the
        trade for staying email-free.
      </p>

      {err && <p className="text-xs text-blush lowercase" role="alert">{err}</p>}
      <BackRow setMode={setMode} />
    </motion.div>
  );
}

function BackRow({ setMode }: { setMode: (m: Mode) => void }) {
  return (
    <button
      onClick={() => setMode("home")}
      className="mt-1 text-xs lowercase text-ink-soft underline underline-offset-4"
    >
      ← back
    </button>
  );
}

"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { startAuthentication } from "@simplewebauthn/browser";
import { api } from "@/lib/api";

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
      {err && <p className="text-xs text-blush lowercase">{err}</p>}
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
  const [phrase, setPhrase] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit() {
    setBusy(true);
    setErr("");
    try {
      await api.post("/api/auth/login", { phrase });
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
      const asseResp = await startAuthentication({ optionsJSON: options });
      await api.post("/api/auth/passkey/auth/verify", asseResp);
      onDone();
    } catch (e) {
      setErr((e as Error).message || "passkey didn't work");
      setBusy(false);
    }
  }

  return (
    <motion.div {...fade} className="mt-7 flex flex-col gap-3">
      <label className="text-xs lowercase text-ink-soft">turn your combination</label>
      <Field
        autoFocus
        placeholder="linen · brass · moth · 7"
        value={phrase}
        onChange={(e) => setPhrase(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && submit()}
      />
      {err && <p className="text-xs text-blush lowercase">{err}</p>}
      <button
        disabled={busy || phrase.trim().length < 3}
        onClick={submit}
        className="rounded-xl bg-ink py-3 text-[15px] lowercase text-panel transition hover:opacity-90 disabled:opacity-40"
      >
        {busy ? "turning…" : "unlock ✦"}
      </button>
      <button
        onClick={passkey}
        disabled={busy}
        className="rounded-xl border border-rule py-2.5 text-[13px] lowercase transition hover:bg-ink/5"
      >
        use a passkey instead
      </button>
      <BackRow setMode={setMode} />
    </motion.div>
  );
}

function Create({ setMode, onDone }: { setMode: (m: Mode) => void; onDone: () => void }) {
  const [combo, setCombo] = useState<{ phrase: string; handle: string } | null>(null);
  const [handle, setHandle] = useState("");
  const [handleTouched, setHandleTouched] = useState(false);
  const [email, setEmail] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  async function roll() {
    const c = await api.get("/api/auth/generate");
    setCombo({ phrase: c.phrase, handle: c.handle });
    // only seed the suggested handle until the user makes it their own
    if (!handleTouched) setHandle(c.handle);
  }
  useEffect(() => {
    // fetch an initial combination on mount; setState happens post-await
    // eslint-disable-next-line react-hooks/set-state-in-effect
    roll();
  }, []);

  async function create() {
    if (!combo) return;
    setBusy(true);
    setErr("");
    try {
      await api.post("/api/auth/register", {
        phrase: combo.phrase,
        handle,
        recoveryEmail: email.trim() || undefined,
      });
      if (typeof window !== "undefined" && (window as any).falorb) {
        (window as any).falorb.track("account_created");
      }
      onDone();
    } catch (e) {
      setErr((e as Error).message);
      setBusy(false);
    }
  }

  return (
    <motion.div {...fade} className="mt-7 flex flex-col gap-3">
      <label className="text-xs lowercase text-ink-soft">your combination — reroll until it feels yours</label>
      <div className="flex items-center gap-2">
        <div className="flex-1 rounded-lg border border-rule bg-ground/40 px-3 py-3 font-[family-name:var(--font-display)] text-[15px]">
          {combo?.phrase ?? "…"}
        </div>
        <button
          onClick={roll}
          className="rounded-lg border border-rule px-3 py-3 text-sm lowercase transition hover:bg-ink/5"
          aria-label="reroll"
        >
          ↻
        </button>
      </div>
      <label className="mt-1 text-xs lowercase text-ink-soft">
        pick your handle — your public name
      </label>
      <div className="flex items-center gap-2">
        <span className="text-ink-soft">✦</span>
        <Field
          placeholder="moth"
          value={handle}
          onChange={(e) => {
            setHandleTouched(true);
            setHandle(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""));
          }}
        />
      </div>

      <label className="mt-1 text-xs lowercase text-ink-soft">
        email — your way back in (recommended)
      </label>
      <Field
        type="email"
        inputMode="email"
        autoComplete="email"
        placeholder="you@example.com"
        value={email}
        onChange={(e) => setEmail(e.target.value.trim())}
        className="lowercase"
      />
      <p className="-mt-1 text-[11px] lowercase text-ink-soft">
        if you ever lose your combination, this is the only way we can let you
        back in — we just email a reset code. nothing else.
      </p>

      {err && <p className="text-xs text-blush lowercase">{err}</p>}
      <button
        disabled={busy || !combo || handle.trim().length < 2}
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
            <span className="text-xs lowercase text-ink-soft">set a new combination</span>
            <Field placeholder="wool · sage · wren · 4" value={newPhrase} onChange={(e) => setNewPhrase(e.target.value)} />
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

      {err && <p className="text-xs text-blush lowercase">{err}</p>}
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

"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { startAuthentication } from "@simplewebauthn/browser";
import { api } from "@/lib/api";

type Mode = "home" | "login" | "create" | "recover";

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
        onClick={() => setMode("login")}
        className="rounded-xl bg-ink py-3 text-[15px] lowercase text-panel transition hover:opacity-90"
      >
        open your wardrobe
      </button>
      <button
        onClick={() => setMode("create")}
        className="rounded-xl border border-rule py-3 text-[15px] lowercase transition hover:bg-ink/5"
      >
        make a new one
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
  const [q1, setQ1] = useState("");
  const [a1, setA1] = useState("");
  const [q2, setQ2] = useState("");
  const [a2, setA2] = useState("");
  const [card, setCard] = useState<string | null>(null);
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
      const recoveryQuestions = [];
      if (q1 && a1) recoveryQuestions.push({ prompt: q1, answer: a1 });
      if (q2 && a2) recoveryQuestions.push({ prompt: q2, answer: a2 });
      const res = await api.post("/api/auth/register", {
        phrase: combo.phrase,
        handle,
        recoveryQuestions,
      });
      setCard(res.recoveryCard);
    } catch (e) {
      setErr((e as Error).message);
      setBusy(false);
    }
  }

  if (card) {
    return (
      <motion.div {...fade} className="mt-7 flex flex-col gap-3">
        <p className="text-sm lowercase">your spare key — screenshot this.</p>
        <div className="rounded-lg border border-rule bg-ground/40 px-3 py-3 font-[family-name:var(--font-display)] text-sm">
          {card}
        </div>
        <p className="text-xs lowercase text-ink-soft">
          it&apos;s a one-time backup combination. keep it somewhere safe.
        </p>
        <button
          onClick={onDone}
          className="rounded-xl bg-ink py-3 text-[15px] lowercase text-panel transition hover:opacity-90"
        >
          enter your wardrobe →
        </button>
      </motion.div>
    );
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

      <details className="mt-1 rounded-lg border border-rule px-3 py-2">
        <summary className="cursor-pointer text-xs lowercase text-ink-soft">
          add recovery questions (optional, recommended)
        </summary>
        <div className="mt-3 flex flex-col gap-2">
          <Field placeholder="a private prompt only you'd know" value={q1} onChange={(e) => setQ1(e.target.value)} />
          <Field placeholder="answer" value={a1} onChange={(e) => setA1(e.target.value)} />
          <Field placeholder="a second prompt" value={q2} onChange={(e) => setQ2(e.target.value)} />
          <Field placeholder="answer" value={a2} onChange={(e) => setA2(e.target.value)} />
          <p className="text-[11px] lowercase text-ink-soft">
            make these obscure — not maiden name or first pet.
          </p>
        </div>
      </details>

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
  const [prompts, setPrompts] = useState<{ id: string; prompt: string }[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [card, setCard] = useState("");
  const [newPhrase, setNewPhrase] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [loaded, setLoaded] = useState(false);

  async function lookup() {
    setBusy(true);
    setErr("");
    try {
      const res = await api.get(`/api/auth/recover?handle=${encodeURIComponent(handle)}`);
      setPrompts(res.prompts);
      setLoaded(true);
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
        answers: prompts.map((p) => ({ id: p.id, answer: answers[p.id] ?? "" })),
        recoveryCard: card || undefined,
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
      <div className="flex gap-2">
        <Field placeholder="moth" value={handle} onChange={(e) => setHandle(e.target.value)} />
        <button
          onClick={lookup}
          disabled={busy || !handle}
          className="rounded-lg border border-rule px-3 text-sm lowercase transition hover:bg-ink/5 disabled:opacity-40"
        >
          find
        </button>
      </div>

      {loaded && (
        <>
          {prompts.map((p) => (
            <div key={p.id} className="flex flex-col gap-1">
              <span className="text-xs lowercase text-ink-soft">{p.prompt}</span>
              <Field
                value={answers[p.id] ?? ""}
                onChange={(e) => setAnswers((a) => ({ ...a, [p.id]: e.target.value }))}
              />
            </div>
          ))}
          <div className="flex flex-col gap-1">
            <span className="text-xs lowercase text-ink-soft">…or your recovery card</span>
            <Field placeholder="spare-key combination" value={card} onChange={(e) => setCard(e.target.value)} />
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-xs lowercase text-ink-soft">set a new combination</span>
            <Field placeholder="wool · sage · wren · 4" value={newPhrase} onChange={(e) => setNewPhrase(e.target.value)} />
          </div>
          <button
            disabled={busy || newPhrase.trim().length < 3}
            onClick={reset}
            className="rounded-xl bg-ink py-3 text-[15px] lowercase text-panel transition hover:opacity-90 disabled:opacity-40"
          >
            {busy ? "recovering…" : "set new combination ✦"}
          </button>
        </>
      )}

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

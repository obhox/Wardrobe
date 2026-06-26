"use client";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { useStore } from "@/lib/store";
import { api } from "@/lib/api";

type Me = {
  handle: string;
  displayName: string | null;
  email: string | null;
};

export default function AccountPanel() {
  const router = useRouter();
  const setPanel = useStore((s) => s.setPanel);

  const [me, setMe] = useState<Me | null>(null);
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [sent, setSent] = useState(false);
  const [note, setNote] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    // load the current account (incl. whether an email is attached)
    api.get("/api/auth/me").then((r) => setMe(r.user)).catch(() => {});
  }, []);

  async function requestCode() {
    setBusy(true);
    setErr("");
    setNote("");
    try {
      await api.post("/api/auth/email/add/request", { email });
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
      const r = await api.post("/api/auth/email/add/verify", { email, code });
      setMe((m) => (m ? { ...m, email: r.email } : m));
      setSent(false);
      setCode("");
      setEmail("");
      setNote("email attached ✦ you can now sign in and recover with it.");
    } catch (e) {
      setErr((e as Error).message);
    }
    setBusy(false);
  }

  async function signOut() {
    await api.post("/api/auth/logout").catch(() => {});
    router.push("/");
  }

  const field =
    "w-full rounded-lg border border-rule bg-ground/40 px-3 py-2.5 text-[15px] lowercase outline-none placeholder:text-ink-soft/60 focus:border-ink";

  return (
    <div className="fixed inset-0 z-[55]" onClick={() => setPanel(null)}>
      <motion.aside
        initial={{ x: 360 }}
        animate={{ x: 0 }}
        exit={{ x: 360 }}
        transition={{ type: "spring", stiffness: 320, damping: 34 }}
        onClick={(e) => e.stopPropagation()}
        className="thin-scroll absolute right-0 top-0 h-full w-full max-w-[330px] overflow-y-auto border-l border-rule bg-panel p-5 shadow-[-12px_0_40px_var(--shadow)]"
      >
        <div className="flex items-center justify-between">
          <h2 className="font-[family-name:var(--font-display)] text-lg lowercase">account</h2>
          <button onClick={() => setPanel(null)} className="text-sm lowercase text-ink-soft">
            close ×
          </button>
        </div>

        {/* ---- who you are ---- */}
        <div className="mt-6">
          <div className="mb-2 text-xs lowercase text-ink-soft">your handle</div>
          <div className="rounded-lg border border-rule bg-ground/40 px-3 py-2.5 text-[15px] lowercase">
            ✦ {me?.handle ?? "…"}
          </div>
        </div>

        {/* ---- email ---- */}
        <div className="mt-6">
          <div className="mb-2 text-xs lowercase text-ink-soft">email</div>

          {me?.email ? (
            <>
              <div className="rounded-lg border border-rule bg-ground/40 px-3 py-2.5 text-[15px] lowercase">
                {me.email}
              </div>
              <p className="mt-2 text-[11px] lowercase text-ink-soft">
                attached — you can sign in and recover with it. to change it, add a new one below.
              </p>
            </>
          ) : (
            <p className="text-[11px] lowercase text-ink-soft">
              no email yet. add one so you can sign in by email and recover your
              wardrobe if you lose your combination.
            </p>
          )}

          {/* add / change email flow */}
          <div className="mt-3 flex flex-col gap-2">
            {!sent ? (
              <>
                <input
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  placeholder={me?.email ? "new email" : "you@example.com"}
                  value={email}
                  onChange={(e) => setEmail(e.target.value.trim())}
                  onKeyDown={(e) => e.key === "Enter" && email.length > 2 && requestCode()}
                  className={field}
                />
                <button
                  disabled={busy || email.length < 3}
                  onClick={requestCode}
                  className="rounded-xl bg-ink py-2.5 text-[14px] lowercase text-panel transition hover:opacity-90 disabled:opacity-40"
                >
                  {busy ? "sending…" : me?.email ? "send code to change" : "send me a code ✦"}
                </button>
              </>
            ) : (
              <>
                <input
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  placeholder="• • • • • •"
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  onKeyDown={(e) => e.key === "Enter" && code.length === 6 && verify()}
                  className={`${field} tracking-[0.3em]`}
                />
                <button
                  disabled={busy || code.length < 6}
                  onClick={verify}
                  className="rounded-xl bg-ink py-2.5 text-[14px] lowercase text-panel transition hover:opacity-90 disabled:opacity-40"
                >
                  {busy ? "confirming…" : "confirm email ✦"}
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
          </div>

          {note && <p className="mt-3 text-xs lowercase text-ink-soft">{note}</p>}
          {err && <p className="mt-3 text-xs lowercase text-blush">{err}</p>}
        </div>

        {/* ---- sign out ---- */}
        <div className="mt-8 border-t border-rule pt-5">
          <button
            onClick={signOut}
            className="w-full rounded-xl border border-rule py-2.5 text-[14px] lowercase transition hover:bg-ink/5"
          >
            sign out
          </button>
        </div>
      </motion.aside>
    </div>
  );
}

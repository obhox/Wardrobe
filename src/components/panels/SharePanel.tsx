"use client";
import { useState } from "react";
import { motion } from "framer-motion";
import { useStore } from "@/lib/store";
import { captureStage, downloadBlob, shareImage } from "@/lib/screenshot";

export default function SharePanel() {
  const setPanel = useStore((s) => s.setPanel);
  const wardrobe = useStore((s) => s.payload?.wardrobe);
  const sections = useStore((s) => s.payload?.sections ?? []);
  const setShare = useStore((s) => s.setShare);
  const setShareDetails = useStore((s) => s.setShareDetails);
  const updateSection = useStore((s) => s.updateSection);

  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [shooting, setShooting] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  if (!wardrobe) return null;

  const shared = wardrobe.visibility === "unlisted" && !!wardrobe.shareCode;
  const link =
    shared && typeof window !== "undefined"
      ? `${window.location.origin}/w/${wardrobe.shareCode}`
      : "";

  async function toggle(enabled: boolean) {
    setBusy(true);
    setNote(null);
    try {
      await setShare(enabled);
      if (enabled && typeof window !== "undefined" && (window as any).falorb) {
        (window as any).falorb.track("wardrobe_shared");
      }
    } catch {
      setNote("couldn't update sharing — try again.");
    } finally {
      setBusy(false);
    }
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      setNote("copy failed — select the link and copy manually.");
    }
  }

  async function shareLink() {
    const nav = navigator as Navigator & { share?: (d: ShareData) => Promise<void> };
    if (nav.share) {
      try {
        await nav.share({ title: wardrobe!.title, url: link });
      } catch {
        /* user dismissed */
      }
    } else {
      copy();
    }
  }

  async function snapshot(mode: "share" | "save") {
    setShooting(true);
    setNote(null);
    try {
      const blob = await captureStage();
      const filename = `${(wardrobe!.title || "wardrobe").replace(/[^a-z0-9]+/gi, "-").toLowerCase()}.png`;
      if (mode === "share") {
        const ok = await shareImage(blob, filename, wardrobe!.title);
        if (!ok) downloadBlob(blob, filename);
      } else {
        downloadBlob(blob, filename);
      }
    } catch {
      setNote("couldn't make a screenshot — try again.");
    } finally {
      setShooting(false);
    }
  }

  const field =
    "w-full rounded-lg border border-rule bg-ground/40 px-3 py-2 text-xs outline-none";

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
          <h2 className="font-[family-name:var(--font-display)] text-lg lowercase">share</h2>
          <button onClick={() => setPanel(null)} className="text-sm lowercase text-ink-soft">
            close ×
          </button>
        </div>

        {/* ---- share link ---- */}
        <Section label="share link">
          <label className="flex items-center justify-between gap-3">
            <span className="text-xs lowercase text-ink-soft">
              {shared
                ? "anyone with the link can peek (read-only)."
                : "off — your wardrobe is private."}
            </span>
            <button
              role="switch"
              aria-checked={shared}
              disabled={busy}
              onClick={() => toggle(!shared)}
              className={
                "relative h-6 w-11 shrink-0 rounded-full transition disabled:opacity-50 " +
                (shared ? "bg-ink" : "bg-rule")
              }
            >
              <span
                className={
                  "absolute top-0.5 h-5 w-5 rounded-full bg-panel shadow transition-all " +
                  (shared ? "left-[1.375rem]" : "left-0.5")
                }
              />
            </button>
          </label>

          {shared && (
            <div className="mt-3 space-y-2">
              <input readOnly value={link} onFocus={(e) => e.target.select()} className={field} />
              <div className="flex gap-2">
                <button
                  onClick={copy}
                  className="flex-1 rounded-full bg-ink px-3 py-2 text-xs lowercase text-panel transition hover:opacity-90"
                >
                  {copied ? "copied ✦" : "copy link"}
                </button>
                <button
                  onClick={shareLink}
                  className="flex-1 rounded-full border border-rule px-3 py-2 text-xs lowercase transition hover:bg-ink/5"
                >
                  share…
                </button>
              </div>
            </div>
          )}
        </Section>

        {/* ---- what viewers see ---- */}
        {shared && (
          <Section label="show item details">
            <Toggle
              on={!!wardrobe.shareDetails}
              onChange={(v) => setShareDetails(v)}
              label={
                wardrobe.shareDetails
                  ? "viewers can tap items to see name, brand & price."
                  : "off — viewers only see the picture."
              }
            />
          </Section>
        )}

        {/* ---- which sections ---- */}
        {shared && sections.length > 0 && (
          <Section label="sections to include">
            <div className="mb-2 flex gap-2">
              <button
                onClick={() => sections.forEach((s) => updateSection(s.id, { shared: true }))}
                className="rounded-full border border-rule px-2.5 py-1 text-[11px] lowercase hover:bg-ink/5"
              >
                everything
              </button>
              <button
                onClick={() => sections.forEach((s) => updateSection(s.id, { shared: false }))}
                className="rounded-full border border-rule px-2.5 py-1 text-[11px] lowercase hover:bg-ink/5"
              >
                none
              </button>
            </div>
            <div className="space-y-1.5">
              {sections.map((s) => (
                <Toggle
                  key={s.id}
                  on={s.shared !== false}
                  onChange={(v) => updateSection(s.id, { shared: v })}
                  label={`${s.name}${s.count ? ` · ${s.count}` : ""}`}
                />
              ))}
            </div>
            <p className="mt-2 text-[11px] lowercase text-ink-soft">
              unsorted items are always visible while sharing is on.
            </p>
          </Section>
        )}

        {/* ---- screenshot ---- */}
        <Section label="screenshot">
          <p className="mb-2 text-xs lowercase text-ink-soft">
            snap the current canvas as an image to share or save.
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => snapshot("share")}
              disabled={shooting}
              className="flex-1 rounded-full bg-ink px-3 py-2 text-xs lowercase text-panel transition hover:opacity-90 disabled:opacity-50"
            >
              {shooting ? "snapping…" : "share image"}
            </button>
            <button
              onClick={() => snapshot("save")}
              disabled={shooting}
              className="flex-1 rounded-full border border-rule px-3 py-2 text-xs lowercase transition hover:bg-ink/5 disabled:opacity-50"
            >
              save .png
            </button>
          </div>
        </Section>

        {note && <p className="mt-4 text-xs lowercase text-blush">{note}</p>}
      </motion.aside>
    </div>
  );
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mt-6">
      <div className="mb-2 text-xs lowercase text-ink-soft">{label}</div>
      {children}
    </div>
  );
}

function Toggle({
  on,
  onChange,
  label,
}: {
  on: boolean;
  onChange: (v: boolean) => void;
  label: string;
}) {
  return (
    <label className="flex items-center justify-between gap-3">
      <span className="text-xs lowercase text-ink-soft">{label}</span>
      <button
        role="switch"
        aria-checked={on}
        onClick={() => onChange(!on)}
        className={
          "relative h-6 w-11 shrink-0 rounded-full transition " + (on ? "bg-ink" : "bg-rule")
        }
      >
        <span
          className={
            "absolute top-0.5 h-5 w-5 rounded-full bg-panel shadow transition-all " +
            (on ? "left-[1.375rem]" : "left-0.5")
          }
        />
      </button>
    </label>
  );
}

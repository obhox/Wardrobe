"use client";
import { useStore } from "@/lib/store";

// Quiet corner controls (brief §18) — no SaaS chrome.
export default function OwnerControls() {
  const setPanel = useStore((s) => s.setPanel);
  const saving = useStore((s) => s.saving);

  const btn =
    "rounded-full border border-rule bg-panel/80 backdrop-blur px-3 py-2 text-[13px] lowercase shadow-[0_6px_16px_var(--shadow)] transition hover:bg-panel sm:px-4 sm:text-sm";

  return (
    <>
      {saving && (
        <div
          data-noshot="true"
          role="status"
          className="absolute right-4 top-4 z-20 text-xs lowercase text-ink-soft"
        >
          saving…
        </div>
      )}

      <nav
        data-noshot="true"
        aria-label="canvas controls"
        className="absolute inset-x-3 bottom-[max(0.75rem,env(safe-area-inset-bottom))] z-20 flex flex-wrap items-center justify-end gap-2 sm:bottom-5 sm:left-auto sm:right-5"
      >
        <button onClick={() => setPanel("stats")} className={btn}>
          stats
        </button>
        <button onClick={() => setPanel("share")} className={btn}>
          share
        </button>
        <button onClick={() => setPanel("arrange")} className={btn}>
          arrange ✦
        </button>
        <button onClick={() => setPanel("beautify")} className={btn}>
          beautify
        </button>
        <button
          onClick={() => setPanel("add")}
          className="rounded-full bg-ink px-4 py-2 text-[13px] lowercase text-panel shadow-[0_6px_16px_var(--shadow)] transition hover:opacity-90 sm:px-5 sm:text-sm"
        >
          + add
        </button>
      </nav>
    </>
  );
}

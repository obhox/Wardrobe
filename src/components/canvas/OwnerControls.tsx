"use client";
import { useStore } from "@/lib/store";

export default function OwnerControls({ onToggleDir }: { onToggleDir: () => void }) {
  const setPanel = useStore((s) => s.setPanel);
  const saving = useStore((s) => s.saving);

  const btn =
    "rounded-full border border-rule bg-panel/80 backdrop-blur px-4 py-2 text-sm lowercase shadow-[0_6px_16px_var(--shadow)] transition hover:bg-panel";

  return (
    <>
      {/* mobile: open directory */}
      <button
        data-noshot="true"
        onClick={onToggleDir}
        className={`absolute left-4 top-4 z-20 md:hidden ${btn}`}
        aria-label="open directory"
      >
        ☰ directory
      </button>

      {/* saving whisper */}
      {saving && (
        <div
          data-noshot="true"
          className="absolute right-4 top-4 z-20 text-xs lowercase text-ink-soft"
        >
          saving…
        </div>
      )}

      {/* quiet corner controls */}
      <div data-noshot="true" className="absolute bottom-5 right-5 z-20 flex items-center gap-2">
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
          className="rounded-full bg-ink px-5 py-2 text-sm lowercase text-panel shadow-[0_6px_16px_var(--shadow)] transition hover:opacity-90"
        >
          + add
        </button>
      </div>
    </>
  );
}

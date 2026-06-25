"use client";
import { useStore } from "@/lib/store";

export default function EmptyState() {
  const setPanel = useStore((s) => s.setPanel);
  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-4 text-center">
      <div className="font-[family-name:var(--font-display)] text-2xl lowercase">
        nothing here yet.
      </div>
      <p className="max-w-xs text-sm lowercase text-ink-soft">
        paste a link to begin — the cutout drops in and floats.
      </p>
      <button
        onClick={() => setPanel("add")}
        className="rounded-xl bg-ink px-5 py-3 text-[15px] lowercase text-panel transition hover:opacity-90"
      >
        add an item ✦
      </button>
    </div>
  );
}

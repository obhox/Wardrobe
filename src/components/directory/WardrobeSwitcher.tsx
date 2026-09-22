"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useStore } from "@/lib/store";
import { api } from "@/lib/api";

// The wardrobe title doubles as a switcher between a person's wardrobes.
export default function WardrobeSwitcher({ onNavigate }: { onNavigate?: () => void }) {
  const router = useRouter();
  const wardrobe = useStore((s) => s.payload?.wardrobe);
  const wardrobes = useStore((s) => s.payload?.wardrobes);
  const setPanel = useStore((s) => s.setPanel);
  const flush = useStore((s) => s.flush);
  const toast = useStore((s) => s.toast);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent | KeyboardEvent) => {
      if (e instanceof KeyboardEvent ? e.key === "Escape" : !box.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", close);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", close);
    };
  }, [open]);

  if (!wardrobe || !wardrobes) return null;

  async function go(id: string) {
    setOpen(false);
    if (id === wardrobe!.id) return;
    await flush();
    onNavigate?.();
    router.push(`/studio/${id}`);
  }

  async function quickNew() {
    setBusy(true);
    try {
      const { id } = await api.post("/api/wardrobes", { template: "blank" });
      await go(id);
    } catch (e) {
      toast((e as Error).message, { tone: "error" });
    }
    setBusy(false);
  }

  return (
    <div ref={box} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="group flex w-full items-center gap-2 rounded-lg text-left"
      >
        <span className="min-w-0 flex-1 truncate font-[family-name:var(--font-display)] text-xl lowercase">
          {wardrobe.icon ?? "✦"} {wardrobe.title}
        </span>
        <span aria-hidden className="text-xs text-ink-soft transition group-hover:text-ink">
          {open ? "▴" : "▾"}
        </span>
      </button>

      {open && (
        <div className="absolute left-0 right-0 top-full z-50 mt-2 rounded-xl border border-rule bg-panel p-1.5 shadow-[0_18px_40px_var(--shadow)]">
          <ul role="listbox" aria-label="your wardrobes" className="thin-scroll max-h-72 overflow-y-auto">
            {wardrobes.map((w) => (
              <li key={w.id}>
                <button
                  role="option"
                  aria-selected={w.id === wardrobe.id}
                  onClick={() => go(w.id)}
                  className={
                    "flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm lowercase transition " +
                    (w.id === wardrobe.id ? "bg-ink/8" : "hover:bg-ink/5")
                  }
                >
                  <span aria-hidden className="w-4 text-center">{w.icon ?? "✦"}</span>
                  <span className="min-w-0 flex-1 truncate">{w.title}</span>
                  <span className="tabular text-xs text-ink-soft">{w.count}</span>
                </button>
              </li>
            ))}
          </ul>
          <div className="mt-1 flex gap-1 border-t border-rule pt-1.5">
            <button
              onClick={quickNew}
              disabled={busy}
              className="flex-1 rounded-lg px-2 py-1.5 text-xs lowercase hover:bg-ink/5 disabled:opacity-50"
            >
              + new wardrobe
            </button>
            <button
              onClick={() => {
                setOpen(false);
                setPanel("wardrobes");
                onNavigate?.();
              }}
              className="flex-1 rounded-lg px-2 py-1.5 text-xs lowercase hover:bg-ink/5"
            >
              manage…
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

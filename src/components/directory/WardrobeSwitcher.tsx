"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronsUpDown, Plus } from "lucide-react";
import { useStore } from "@/lib/store";
import { api } from "@/lib/api";
import { cx } from "@/lib/cx";

// The wardrobe title doubles as a switcher between a person's wardrobes.
export default function WardrobeSwitcher({ onNavigate }: { onNavigate?: () => void }) {
  const router = useRouter();
  const wardrobe = useStore((s) => s.payload?.wardrobe);
  const wardrobes = useStore((s) => s.payload?.wardrobes);
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
        className="group flex w-full items-center gap-2 rounded-control text-left"
      >
        <span className="cap-first min-w-0 flex-1 truncate font-display text-heading">{wardrobe.title}</span>
        <ChevronsUpDown aria-hidden className="h-4 w-4 shrink-0 text-ink-faint transition group-hover:text-ink" />
      </button>

      {open && (
        <div className="absolute left-0 right-0 top-full z-50 mt-2 rounded-card border border-rule bg-panel p-1.5 shadow-card">
          <ul role="listbox" aria-label="Your wardrobes" className="thin-scroll max-h-72 overflow-y-auto">
            {wardrobes.map((w) => (
              <li key={w.id}>
                <button
                  role="option"
                  aria-selected={w.id === wardrobe.id}
                  onClick={() => go(w.id)}
                  className={cx(
                    "flex w-full items-center gap-2 rounded-control px-2.5 py-2 text-left transition",
                    w.id === wardrobe.id ? "bg-ink/7" : "hover:bg-ink/4"
                  )}
                >
                  <span aria-hidden className="w-4 text-center text-ink-soft">{w.icon ?? "✦"}</span>
                  <span className="cap-first min-w-0 flex-1 truncate">{w.title}</span>
                  <span className="label-caps tabular text-ink-faint">{w.count}</span>
                </button>
              </li>
            ))}
          </ul>
          <div className="mt-1 flex gap-1 border-t border-rule pt-1.5 text-caption">
            <button
              onClick={quickNew}
              disabled={busy}
              className="flex flex-1 items-center justify-center gap-1 rounded-control px-2 py-2 hover:bg-ink/4 disabled:opacity-50"
            >
              <Plus aria-hidden className="h-3.5 w-3.5" /> New wardrobe
            </button>
            <Link href="/you" className="flex-1 rounded-control px-2 py-2 text-center hover:bg-ink/4">
              Manage
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

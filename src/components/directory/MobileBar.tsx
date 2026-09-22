"use client";
import { useStore } from "@/lib/store";

// Phones: the directory sits on top as a compact bar — title, then a
// scrollable strip of filter + section chips (brief §20 / §25.5).
export default function MobileBar({ onOpenDirectory }: { onOpenDirectory: () => void }) {
  const payload = useStore((s) => s.payload);
  const activeSection = useStore((s) => s.activeSection);
  const setSection = useStore((s) => s.setSection);
  const filter = useStore((s) => s.filter);
  const setFilter = useStore((s) => s.setFilter);
  if (!payload) return null;
  const { wardrobe, sections, items } = payload;

  const chip = (on: boolean, label: string, onClick: () => void, key?: string) => (
    <button
      key={key ?? label}
      onClick={onClick}
      aria-pressed={on}
      className={
        "shrink-0 rounded-full px-3 py-1 text-xs lowercase transition " +
        (on ? "bg-ink text-panel" : "border border-rule bg-panel/60")
      }
    >
      {label}
    </button>
  );

  return (
    <header className="relative z-20 border-b border-rule bg-panel/80 pt-[env(safe-area-inset-top)] backdrop-blur md:hidden">
      <div className="flex items-center gap-2 px-3 pt-2.5">
        <button
          onClick={onOpenDirectory}
          aria-label="open directory"
          className="rounded-lg border border-rule px-2.5 py-1.5 text-sm"
        >
          ☰
        </button>
        <button onClick={onOpenDirectory} className="min-w-0 flex-1 truncate text-left font-[family-name:var(--font-display)] text-base lowercase">
          {wardrobe.icon ?? "✦"} {wardrobe.title}
        </button>
      </div>
      <nav aria-label="quick filters" className="no-scrollbar flex gap-1.5 overflow-x-auto px-3 py-2">
        {chip(activeSection === null && filter === "all", `all ${items.length}`, () => {
          setSection(null);
          setFilter("all");
        })}
        {chip(filter === "want", "want", () => setFilter(filter === "want" ? "all" : "want"))}
        {sections.map((s) =>
          chip(activeSection === s.id, `${s.name} ${s.count ?? 0}`, () => setSection(activeSection === s.id ? null : s.id), s.id)
        )}
      </nav>
    </header>
  );
}

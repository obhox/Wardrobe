"use client";
import { Menu, Plus, Share2, SlidersHorizontal } from "lucide-react";
import { useStore } from "@/lib/store";
import { IconButton } from "@/components/ui/Button";
import { Chip } from "@/components/ui/Chip";

// Phones: the directory sits on top as a compact bar — the title and the main
// actions, then a scrollable strip of filter + section chips (brief §20 / §25.5).
export default function MobileBar({ onOpenDirectory }: { onOpenDirectory: () => void }) {
  const payload = useStore((s) => s.payload);
  const activeSection = useStore((s) => s.activeSection);
  const setSection = useStore((s) => s.setSection);
  const filter = useStore((s) => s.filter);
  const setFilter = useStore((s) => s.setFilter);
  const setPanel = useStore((s) => s.setPanel);
  if (!payload) return null;
  const { wardrobe, sections, items } = payload;

  const count = (n: number) => <span className="tabular opacity-70">{n}</span>;

  return (
    <header className="relative z-20 border-b border-rule bg-ground pt-[env(safe-area-inset-top)] md:hidden">
      <div className="flex items-center gap-0.5 pl-1.5 pr-3 pt-2">
        <IconButton label="Sections and settings" onClick={onOpenDirectory}>
          <Menu aria-hidden className="h-5 w-5" />
        </IconButton>
        <button onClick={onOpenDirectory} className="cap-first min-w-0 flex-1 truncate px-1 text-left font-display text-title">
          {wardrobe.title}
        </button>
        <IconButton label="Arrange" onClick={() => setPanel("arrange")}>
          <SlidersHorizontal aria-hidden className="h-5 w-5" />
        </IconButton>
        <IconButton label="Share" onClick={() => setPanel("share")}>
          <Share2 aria-hidden className="h-5 w-5" />
        </IconButton>
        <IconButton label="Add an item" variant="primary" className="ml-1.5" onClick={() => setPanel("add")}>
          <Plus aria-hidden className="h-5 w-5" />
        </IconButton>
      </div>
      <nav aria-label="Quick filters" className="no-scrollbar flex gap-1.5 overflow-x-auto px-3 py-2.5">
        <Chip
          on={activeSection === null && filter === "all"}
          onClick={() => {
            setSection(null);
            setFilter("all");
          }}
        >
          All {count(items.length)}
        </Chip>
        <Chip on={filter === "owned"} onClick={() => setFilter(filter === "owned" ? "all" : "owned")}>
          Owned
        </Chip>
        <Chip on={filter === "want"} onClick={() => setFilter(filter === "want" ? "all" : "want")}>
          Want
        </Chip>
        {sections.map((s) => (
          <Chip key={s.id} on={activeSection === s.id} onClick={() => setSection(activeSection === s.id ? null : s.id)}>
            <span className="cap-first">{s.name}</span> {count(s.count ?? 0)}
          </Chip>
        ))}
      </nav>
    </header>
  );
}

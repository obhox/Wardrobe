"use client";
import { useMemo, useState } from "react";
import { ChevronDown, ChevronRight, Plus, Search } from "lucide-react";
import { useStore } from "@/lib/store";
import { sortItems } from "@/lib/layout";
import { cx } from "@/lib/cx";
import type { Item } from "@/lib/types";
import { Chip } from "@/components/ui/Chip";
import SectionRow, { ItemRow } from "./SectionRow";
import WardrobeSwitcher from "./WardrobeSwitcher";
import Notifications from "./Notifications";

// The directory (brief §18/§20): the calm spine and the accessible text view
// of everything — a real, keyboard-navigable list of sections and items.
export default function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const payload = useStore((s) => s.payload);
  const filter = useStore((s) => s.filter);
  const setFilter = useStore((s) => s.setFilter);
  const search = useStore((s) => s.search);
  const setSearch = useStore((s) => s.setSearch);
  const activeSection = useStore((s) => s.activeSection);
  const setSection = useStore((s) => s.setSection);
  const setPanel = useStore((s) => s.setPanel);
  const addSection = useStore((s) => s.addSection);
  const reorderSections = useStore((s) => s.reorderSections);
  const select = useStore((s) => s.select);
  const unsortedDrop = useStore((s) => s.dropSection === "__unsorted");

  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState("");
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const q = search.trim().toLowerCase();
  const visible = useMemo(() => {
    if (!payload) return [] as Item[];
    const sorted = sortItems(payload.items, payload.wardrobe.sortKey, payload.sections);
    return sorted.filter(
      (it) =>
        (filter === "all" || it.status === filter) &&
        (!q || it.name.toLowerCase().includes(q) || (it.brand ?? "").toLowerCase().includes(q) || (it.notes ?? "").toLowerCase().includes(q))
    );
  }, [payload, filter, q]);

  if (!payload) return null;
  const { wardrobe, sections, items } = payload;
  const unsorted = visible.filter((i) => !i.sectionId);
  const unsortedCount = items.filter((i) => !i.sectionId).length;
  // while searching, every section with a match opens by itself
  const isOpen = (id: string) => expanded.has(id) || (!!q && visible.some((i) => (id === "__unsorted" ? !i.sectionId : i.sectionId === id)));
  const toggle = (id: string) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  function open(id: string) {
    select(id);
    onNavigate?.();
  }

  function move(index: number, dir: -1 | 1) {
    const ids = sections.map((s) => s.id);
    const j = index + dir;
    if (j < 0 || j >= ids.length) return;
    [ids[index], ids[j]] = [ids[j], ids[index]];
    reorderSections(ids);
  }

  function openPanel(panel: "account" | "stats" | "beautify") {
    setPanel(panel);
    onNavigate?.();
  }

  const footerLink = "rounded py-1 underline-offset-4 hover:text-ink hover:underline";

  return (
    <aside aria-label="Directory" className="flex h-full flex-col border-r border-rule bg-ground">
      <div className="px-4 pt-5">
        <WardrobeSwitcher onNavigate={onNavigate} />
        <p className="mt-0.5 truncate text-caption text-ink-soft">
          {[wardrobe.tagline, `@${wardrobe.handle}`].filter(Boolean).join(" · ")}
        </p>
      </div>

      <div className="relative px-4 pt-4">
        <label htmlFor="directory-search" className="sr-only">
          Search this wardrobe
        </label>
        <Search aria-hidden className="pointer-events-none absolute left-7 top-[1.65rem] h-4 w-4 text-ink-faint" />
        <input
          id="directory-search"
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => e.key === "Escape" && setSearch("")}
          placeholder="Search"
          className="h-10 w-full rounded-control border border-rule-strong bg-panel pl-9 pr-3 text-base placeholder:text-ink-faint focus:border-ink md:text-sm"
        />
        {/* the "/" shortcut only exists where there is a keyboard */}
        {!search && (
          <kbd className="pointer-events-none absolute right-7 top-[1.6rem] hidden rounded border border-rule px-1.5 font-mono text-label text-ink-faint [@media(hover:hover)]:block">
            /
          </kbd>
        )}
      </div>

      <div className="flex gap-1.5 px-4 pt-3" role="group" aria-label="Filter by status">
        <Chip on={filter === "all"} onClick={() => setFilter("all")}>All</Chip>
        <Chip on={filter === "owned"} onClick={() => setFilter("owned")}>Owned</Chip>
        <Chip on={filter === "want"} onClick={() => setFilter("want")}>Want</Chip>
      </div>

      <nav aria-label="Sections" className="thin-scroll mt-5 flex-1 overflow-y-auto px-2 pb-4">
        <h2 className="label-caps px-2 pb-1.5 text-ink-faint">Sections</h2>
        <button
          onClick={() => {
            setSection(null);
            onNavigate?.();
          }}
          aria-pressed={activeSection === null}
          className={cx(
            "flex h-9 w-full items-baseline gap-2 rounded-control pl-[1.9rem] pr-2 pt-2 text-left transition",
            activeSection === null ? "bg-ink/7" : "hover:bg-ink/4"
          )}
        >
          Everything <span className="label-caps tabular text-ink-faint">{items.length}</span>
        </button>

        <ul>
          {sections.map((sec, i) => (
            <SectionRow
              key={sec.id}
              section={sec}
              items={visible.filter((it) => it.sectionId === sec.id)}
              active={activeSection === sec.id}
              expanded={isOpen(sec.id)}
              onToggle={() => toggle(sec.id)}
              onSelect={() => {
                setSection(activeSection === sec.id ? null : sec.id);
                onNavigate?.();
              }}
              onOpenItem={open}
              isFirst={i === 0}
              isLast={i === sections.length - 1}
              onMove={(dir) => move(i, dir)}
            />
          ))}

          {unsortedCount > 0 && (
            <SectionRowUnsorted
              count={unsortedCount}
              items={unsorted}
              active={activeSection === "__unsorted"}
              expanded={isOpen("__unsorted")}
              dropOver={unsortedDrop}
              onToggle={() => toggle("__unsorted")}
              onSelect={() => setSection(activeSection === "__unsorted" ? null : "__unsorted")}
              onOpenItem={open}
            />
          )}
        </ul>

        {adding ? (
          <div className="px-1 pt-2">
            <input
              autoFocus
              aria-label="New section name"
              value={newName}
              maxLength={40}
              onChange={(e) => setNewName(e.target.value)}
              onBlur={() => !newName.trim() && setAdding(false)}
              onKeyDown={async (e) => {
                if (e.key === "Enter" && newName.trim()) {
                  await addSection(newName.trim());
                  setNewName("");
                  setAdding(false);
                }
                if (e.key === "Escape") setAdding(false);
              }}
              placeholder="Name it, then press Enter"
              className="h-9 w-full rounded-control border border-rule-strong bg-panel px-2.5 text-base placeholder:text-ink-faint md:text-sm"
            />
          </div>
        ) : (
          <button
            onClick={() => setAdding(true)}
            className="mt-1 flex h-9 items-center gap-1.5 rounded-control pl-[1.9rem] pr-2 text-caption text-ink-soft hover:text-ink"
          >
            <Plus aria-hidden className="h-3.5 w-3.5" /> New section
          </button>
        )}
        <p className="mt-3 hidden pl-[1.9rem] pr-2 text-caption text-ink-faint md:block">
          In the collage, drag an item onto a section to file it.
        </p>
      </nav>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-rule px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] text-caption text-ink-soft">
        <button onClick={() => openPanel("account")} className={footerLink}>
          Account
        </button>
        <Notifications />
        {/* on wider screens these two sit in the toolbar above the stage */}
        <button onClick={() => openPanel("stats")} className={cx(footerLink, "md:hidden")}>
          Stats
        </button>
        <button onClick={() => openPanel("beautify")} className={cx(footerLink, "md:hidden")}>
          Appearance
        </button>
      </div>
    </aside>
  );
}

// items with no section: a row like the others, without a name to edit
function SectionRowUnsorted({
  count,
  items,
  active,
  expanded,
  dropOver,
  onToggle,
  onSelect,
  onOpenItem,
}: {
  count: number;
  items: Item[];
  active: boolean;
  expanded: boolean;
  dropOver: boolean;
  onToggle: () => void;
  onSelect: () => void;
  onOpenItem: (id: string) => void;
}) {
  return (
    <li>
      <div
        data-section-drop="__unsorted"
        className={cx(
          "flex h-9 items-center gap-1.5 rounded-control pl-1 pr-1.5 text-ink-soft transition",
          active ? "bg-ink/7" : "hover:bg-ink/4",
          dropOver && "ring-2 ring-ink"
        )}
      >
        <button
          onClick={onToggle}
          aria-expanded={expanded}
          aria-label={`${expanded ? "Collapse" : "Expand"} unsorted`}
          className="flex h-6 w-5 shrink-0 items-center justify-center text-ink-faint hover:text-ink"
        >
          {expanded ? <ChevronDown aria-hidden className="h-3.5 w-3.5" /> : <ChevronRight aria-hidden className="h-3.5 w-3.5" />}
        </button>
        <span className="h-2 w-2 shrink-0 rounded-full border border-ink-faint" aria-hidden />
        <button onClick={onSelect} aria-pressed={active} className="flex min-w-0 flex-1 items-baseline gap-2 py-1 text-left">
          Unsorted <span className="label-caps tabular text-ink-faint">{count}</span>
        </button>
      </div>
      {expanded && (
        <ul className="mb-1 ml-[1.35rem] border-l border-rule pl-2">
          {items.map((it) => (
            <ItemRow key={it.id} item={it} onOpen={onOpenItem} />
          ))}
        </ul>
      )}
    </li>
  );
}

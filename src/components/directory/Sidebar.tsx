"use client";
import { useMemo, useState } from "react";
import { useStore } from "@/lib/store";
import { sortItems } from "@/lib/layout";
import type { Item } from "@/lib/types";
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

  const chip = (f: typeof filter, label: string) => (
    <button
      onClick={() => setFilter(f)}
      aria-pressed={filter === f}
      className={
        "rounded-full px-3 py-1 text-xs lowercase transition " +
        (filter === f ? "bg-ink text-panel" : "border border-rule hover:bg-ink/5")
      }
    >
      {label}
    </button>
  );

  return (
    <aside aria-label="directory" className="flex h-full flex-col border-r border-rule bg-panel/90 backdrop-blur md:bg-panel/70">
      <div className="px-4 pt-5">
        <WardrobeSwitcher onNavigate={onNavigate} />
        <div className="mt-0.5 truncate text-xs lowercase text-ink-soft">
          {[wardrobe.tagline, `✦ ${wardrobe.handle}`].filter(Boolean).join(" · ")}
        </div>
      </div>

      <div className="px-4 pt-4">
        <label htmlFor="directory-search" className="sr-only">
          search this wardrobe
        </label>
        <input
          id="directory-search"
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => e.key === "Escape" && setSearch("")}
          placeholder="search…  ( / )"
          className="w-full rounded-lg border border-rule bg-ground/40 px-3 py-2 text-base lowercase outline-none placeholder:text-ink-soft/60 focus:border-ink md:text-sm"
        />
      </div>

      <div className="flex gap-1.5 px-4 pt-3" role="group" aria-label="filter by status">
        {chip("all", "all")}
        {chip("owned", "owned")}
        {chip("want", "want")}
      </div>

      <button
        onClick={() => {
          setPanel("add");
          onNavigate?.();
        }}
        className="mx-4 mt-4 rounded-xl bg-ink py-2.5 text-sm lowercase text-panel transition hover:opacity-90"
      >
        + add an item
      </button>

      <nav aria-label="sections" className="thin-scroll mt-4 flex-1 overflow-y-auto px-2 pb-4">
        <button
          onClick={() => {
            setSection(null);
            onNavigate?.();
          }}
          aria-pressed={activeSection === null}
          className={
            "ml-5 flex w-[calc(100%-1.25rem)] items-center gap-2 rounded-lg px-2 py-1.5 text-[15px] lowercase transition " +
            (activeSection === null ? "bg-ink/8" : "hover:bg-ink/5")
          }
        >
          everything <span className="tabular text-ink-soft">({items.length})</span>
        </button>

        <ul className="mt-0.5">
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
            <li>
              <div
                data-section-drop="__unsorted"
                className={
                  "flex items-center gap-1.5 rounded-lg px-1.5 py-1 text-[14px] lowercase text-ink-soft " +
                  (activeSection === "__unsorted" ? "bg-ink/8 " : "hover:bg-ink/5 ") +
                  (unsortedDrop ? "ring-2 ring-ink" : "")
                }
              >
                <button
                  onClick={() => toggle("__unsorted")}
                  aria-expanded={isOpen("__unsorted")}
                  aria-label={`${isOpen("__unsorted") ? "collapse" : "expand"} unsorted`}
                  className="w-4 shrink-0 text-[10px] hover:text-ink"
                >
                  {isOpen("__unsorted") ? "▾" : "▸"}
                </button>
                <span className="h-2 w-2 shrink-0 rounded-full border border-ink-soft" aria-hidden />
                <button
                  onClick={() => setSection(activeSection === "__unsorted" ? null : "__unsorted")}
                  aria-pressed={activeSection === "__unsorted"}
                  className="min-w-0 flex-1 truncate text-left"
                >
                  unsorted <span className="tabular">({unsortedCount})</span>
                </button>
              </div>
              {isOpen("__unsorted") && (
                <ul className="mb-1 ml-7 border-l border-rule pl-2">
                  {unsorted.map((it) => (
                    <ItemRow key={it.id} item={it} onOpen={open} />
                  ))}
                </ul>
              )}
            </li>
          )}
        </ul>

        {adding ? (
          <div className="px-2 pt-2">
            <input
              autoFocus
              aria-label="new section name"
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
              placeholder="new section… (enter)"
              className="w-full rounded border border-rule bg-ground/40 px-2 py-1 text-base lowercase outline-none md:text-sm"
            />
          </div>
        ) : (
          <button
            onClick={() => setAdding(true)}
            className="ml-5 mt-1 px-2 py-1.5 text-xs lowercase text-ink-soft underline underline-offset-4 hover:text-ink"
          >
            + new section
          </button>
        )}
        <p className="ml-7 mt-3 hidden text-[11px] lowercase text-ink-soft/80 md:block">
          tip: drag a cutout onto a section to file it.
        </p>
      </nav>

      <div className="flex items-center justify-between gap-3 border-t border-rule px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] text-xs lowercase text-ink-soft">
        <button onClick={() => setPanel("account")} className="underline-offset-4 hover:text-ink hover:underline">
          account
        </button>
        <Notifications />
        <button onClick={() => setPanel("stats")} className="underline-offset-4 hover:text-ink hover:underline">
          stats
        </button>
      </div>
    </aside>
  );
}

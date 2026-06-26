"use client";
import { useState } from "react";
import { useStore } from "@/lib/store";
import SectionRow from "./SectionRow";

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

  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState("");

  if (!payload) return null;
  const { wardrobe, sections, items } = payload;
  const unsortedCount = items.filter((i) => !i.sectionId).length;

  const chip = (f: typeof filter, label: string) => (
    <button
      onClick={() => setFilter(f)}
      className={
        "rounded-full px-3 py-1 text-xs lowercase transition " +
        (filter === f ? "bg-ink text-panel" : "border border-rule hover:bg-ink/5")
      }
    >
      {label}
    </button>
  );

  return (
    <aside className="flex h-full flex-col border-r border-rule bg-panel/70 backdrop-blur">
      <div className="px-4 pt-5">
        <div className="font-[family-name:var(--font-display)] text-xl lowercase">
          ✦ {wardrobe.title}
        </div>
        <div className="mt-0.5 text-xs lowercase text-ink-soft">
          {wardrobe.tagline} · <span className="text-ink-soft">{wardrobe.handle}</span>
        </div>
      </div>

      <div className="px-4 pt-4">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="search…"
          className="w-full rounded-lg border border-rule bg-ground/40 px-3 py-2 text-sm lowercase outline-none placeholder:text-ink-soft/60 focus:border-ink"
        />
      </div>

      <div className="flex gap-1.5 px-4 pt-3">
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

      <nav className="thin-scroll mt-4 flex-1 overflow-y-auto px-2 pb-4">
        <button
          onClick={() => {
            setSection(null);
            onNavigate?.();
          }}
          className={
            "flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-[15px] lowercase transition " +
            (activeSection === null ? "bg-ink/8" : "hover:bg-ink/5")
          }
        >
          everything <span className="tabular text-ink-soft">({items.length})</span>
        </button>

        {sections.map((sec) => (
          <SectionRow
            key={sec.id}
            section={sec}
            active={activeSection === sec.id}
            onSelect={() => {
              setSection(sec.id);
              onNavigate?.();
            }}
          />
        ))}

        {unsortedCount > 0 && (
          <div className="px-2 py-1.5 text-[13px] lowercase text-ink-soft">
            unsorted ({unsortedCount})
          </div>
        )}

        {adding ? (
          <div className="px-2 pt-2">
            <input
              autoFocus
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={async (e) => {
                if (e.key === "Enter" && newName.trim()) {
                  await addSection(newName.trim());
                  setNewName("");
                  setAdding(false);
                }
                if (e.key === "Escape") setAdding(false);
              }}
              placeholder="new section…"
              className="w-full rounded border border-rule bg-ground/40 px-2 py-1 text-sm lowercase outline-none"
            />
          </div>
        ) : (
          <button
            onClick={() => setAdding(true)}
            className="mt-1 px-2 py-1.5 text-xs lowercase text-ink-soft underline underline-offset-4"
          >
            + new section
          </button>
        )}
      </nav>

      <div className="flex items-center justify-between border-t border-rule px-4 py-3 text-xs lowercase text-ink-soft">
        <button
          onClick={() => setPanel("account")}
          className="underline underline-offset-4 hover:text-ink"
        >
          account
        </button>
        <span>wardrobe</span>
      </div>
    </aside>
  );
}

"use client";
import { useState } from "react";
import { useStore } from "@/lib/store";
import { ACCENTS, ACCENT_HEX } from "@/lib/theme";
import type { Section, Accent, Item } from "@/lib/types";

export const SECTION_ICONS = ["✦", "○", "◇", "△", "□", "♡", "✿", "☂", "⚙", "♪", "☀", "✂"];

export default function SectionRow({
  section,
  items,
  active,
  expanded,
  onToggle,
  onSelect,
  onOpenItem,
  isFirst,
  isLast,
  onMove,
}: {
  section: Section;
  items: Item[];
  active: boolean;
  expanded: boolean;
  onToggle: () => void;
  onSelect: () => void;
  onOpenItem: (id: string) => void;
  isFirst?: boolean;
  isLast?: boolean;
  onMove?: (dir: -1 | 1) => void;
}) {
  const updateSection = useStore((s) => s.updateSection);
  const deleteSection = useStore((s) => s.deleteSection);
  const dropOver = useStore((s) => s.dropSection === section.id);
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(section.name);

  const dot = section.color ? ACCENT_HEX[section.color as Accent] ?? section.color : "var(--ink-soft)";
  const listId = `section-items-${section.id}`;

  function commitName() {
    const next = name.trim();
    if (next && next !== section.name) updateSection(section.id, { name: next });
    else setName(section.name);
  }

  return (
    <li>
      <div
        data-section-drop={section.id}
        className={
          "group flex items-center gap-1.5 rounded-lg px-1.5 py-1 text-[15px] lowercase transition " +
          (active ? "bg-ink/8 " : "hover:bg-ink/5 ") +
          (dropOver ? "ring-2 ring-ink" : "")
        }
      >
        <button
          onClick={onToggle}
          aria-expanded={expanded}
          aria-controls={listId}
          aria-label={`${expanded ? "collapse" : "expand"} ${section.name}`}
          className="w-4 shrink-0 text-[10px] text-ink-soft hover:text-ink"
        >
          {expanded ? "▾" : "▸"}
        </button>
        <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: dot }} aria-hidden />
        {editing ? (
          <input
            autoFocus
            aria-label="section name"
            value={name}
            maxLength={40}
            onChange={(e) => setName(e.target.value)}
            onBlur={commitName}
            onKeyDown={(e) => {
              if (e.key === "Enter") (e.target as HTMLInputElement).blur();
              if (e.key === "Escape") {
                setName(section.name);
                setEditing(false);
              }
            }}
            className="min-w-0 flex-1 rounded border border-rule bg-ground/40 px-1.5 py-1 text-base outline-none sm:py-0 sm:text-[15px]"
          />
        ) : (
          <button onClick={onSelect} aria-pressed={active} className="min-w-0 flex-1 truncate py-0.5 text-left">
            {section.icon && section.icon !== "✦" ? `${section.icon} ` : ""}
            {section.name} <span className="tabular text-ink-soft">({section.count ?? 0})</span>
          </button>
        )}

        <span className="ml-auto flex shrink-0 items-center gap-1 opacity-0 transition group-focus-within:opacity-100 group-hover:opacity-100 [@media(hover:none)]:opacity-100">
          <button
            onClick={() => {
              setName(section.name);
              setEditing((v) => !v);
            }}
            className="rounded px-1 text-xs text-ink-soft hover:text-ink"
            aria-label={`edit ${section.name}`}
            aria-expanded={editing}
          >
            {editing ? "done" : "edit"}
          </button>
          <button
            onClick={() => deleteSection(section.id)}
            className="rounded px-1 text-xs text-ink-soft hover:text-blush"
            aria-label={`remove ${section.name}`}
          >
            ×
          </button>
        </span>
      </div>

      {editing && (
        <div className="mb-2 ml-6 mr-1 mt-1 space-y-2 rounded-lg border border-rule bg-ground/20 p-2">
          <div className="flex flex-wrap gap-1" role="group" aria-label="icon">
            {SECTION_ICONS.map((ic) => (
              <button
                key={ic}
                aria-pressed={section.icon === ic}
                aria-label={`icon ${ic}`}
                onClick={() => updateSection(section.id, { icon: ic })}
                className={"h-7 w-7 rounded-md text-sm " + (section.icon === ic ? "bg-ink text-panel" : "hover:bg-ink/5")}
              >
                {ic}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap gap-1.5" role="group" aria-label="colour">
            {ACCENTS.map((a) => (
              <button
                key={a.id}
                aria-pressed={section.color === a.id}
                aria-label={a.id}
                onClick={() => updateSection(section.id, { color: a.id })}
                className={"h-6 w-6 rounded-full border-2 " + (section.color === a.id ? "border-ink" : "border-transparent")}
                style={{ background: a.hex }}
              />
            ))}
          </div>
          {onMove && (
            <div className="flex gap-2 text-xs lowercase">
              <button disabled={isFirst} onClick={() => onMove(-1)} className="underline underline-offset-4 disabled:opacity-30">
                move up
              </button>
              <button disabled={isLast} onClick={() => onMove(1)} className="underline underline-offset-4 disabled:opacity-30">
                move down
              </button>
            </div>
          )}
        </div>
      )}

      {expanded && (
        <ul id={listId} className="mb-1 ml-7 border-l border-rule pl-2">
          {items.length === 0 ? (
            <li className="py-1 text-xs lowercase text-ink-soft">nothing here{active ? "" : " yet"}.</li>
          ) : (
            items.map((it) => <ItemRow key={it.id} item={it} onOpen={onOpenItem} />)
          )}
        </ul>
      )}
    </li>
  );
}

export function ItemRow({ item, onOpen }: { item: Item; onOpen: (id: string) => void }) {
  return (
    <li>
      <button
        onClick={() => onOpen(item.id)}
        className="flex w-full items-center gap-2 rounded px-1 py-0.5 text-left text-[13px] lowercase text-ink-soft hover:bg-ink/5 hover:text-ink"
      >
        <span className="min-w-0 flex-1 truncate">{item.name}</span>
        {item.status === "want" && <span className="shrink-0 text-[10px]">✦ want</span>}
      </button>
    </li>
  );
}

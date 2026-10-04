"use client";
import { useState } from "react";
import { ChevronDown, ChevronRight, Pencil, X } from "lucide-react";
import { useStore } from "@/lib/store";
import { SECTION_COLORS, SECTION_COLOR_HEX } from "@/lib/theme";
import { cx } from "@/lib/cx";
import type { Section, SectionColor, Item } from "@/lib/types";
import { Tag } from "@/components/ui/Chip";

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

  const dot = section.color ? SECTION_COLOR_HEX[section.color as SectionColor] ?? section.color : "var(--ink-faint)";
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
        className={cx(
          "group flex h-9 items-center gap-1.5 rounded-control pl-1 pr-1.5 transition",
          active ? "bg-ink/7" : "hover:bg-ink/4",
          dropOver && "ring-2 ring-ink"
        )}
      >
        <button
          onClick={onToggle}
          aria-expanded={expanded}
          aria-controls={listId}
          aria-label={`${expanded ? "Collapse" : "Expand"} ${section.name}`}
          className="flex h-6 w-5 shrink-0 items-center justify-center text-ink-faint hover:text-ink"
        >
          {expanded ? <ChevronDown aria-hidden className="h-3.5 w-3.5" /> : <ChevronRight aria-hidden className="h-3.5 w-3.5" />}
        </button>
        <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: dot }} aria-hidden />
        {editing ? (
          <input
            autoFocus
            aria-label="Section name"
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
            className="h-7 min-w-0 flex-1 rounded-md border border-rule-strong bg-panel px-1.5 text-base md:text-sm"
          />
        ) : (
          <button onClick={onSelect} aria-pressed={active} className="flex min-w-0 flex-1 items-baseline gap-2 py-1 text-left">
            <span className="cap-first truncate">
              {section.icon && section.icon !== "✦" ? `${section.icon} ` : ""}
              {section.name}
            </span>
            <span className="label-caps tabular text-ink-faint">{section.count ?? 0}</span>
          </button>
        )}

        <span className="ml-auto flex shrink-0 items-center opacity-0 transition group-focus-within:opacity-100 group-hover:opacity-100 [@media(hover:none)]:opacity-100">
          <button
            onClick={() => {
              setName(section.name);
              setEditing((v) => !v);
            }}
            className="flex h-7 w-7 items-center justify-center rounded-md text-ink-faint hover:text-ink"
            aria-label={`Edit ${section.name}`}
            aria-expanded={editing}
          >
            <Pencil aria-hidden className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => deleteSection(section.id)}
            className="flex h-7 w-7 items-center justify-center rounded-md text-ink-faint hover:text-danger"
            aria-label={`Remove ${section.name}`}
          >
            <X aria-hidden className="h-3.5 w-3.5" />
          </button>
        </span>
      </div>

      {editing && (
        <div className="mb-2 ml-6 mr-1 mt-1 space-y-2.5 rounded-card border border-rule bg-panel p-2.5">
          <div className="flex flex-wrap gap-1" role="group" aria-label="Icon">
            {SECTION_ICONS.map((ic) => (
              <button
                key={ic}
                aria-pressed={section.icon === ic}
                aria-label={`Icon ${ic}`}
                onClick={() => updateSection(section.id, { icon: ic })}
                className={cx("h-7 w-7 rounded-md text-sm", section.icon === ic ? "bg-ink text-ground" : "hover:bg-ink/6")}
              >
                {ic}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap gap-1.5" role="group" aria-label="Colour">
            {SECTION_COLORS.map((c) => (
              <button
                key={c.id}
                aria-pressed={section.color === c.id}
                aria-label={c.id}
                onClick={() => updateSection(section.id, { color: c.id })}
                className={cx("h-6 w-6 rounded-full border-2", section.color === c.id ? "border-ink" : "border-transparent")}
                style={{ background: c.hex }}
              />
            ))}
          </div>
          {onMove && (
            <div className="flex gap-3 text-caption">
              <button disabled={isFirst} onClick={() => onMove(-1)} className="underline underline-offset-4 disabled:opacity-30">
                Move up
              </button>
              <button disabled={isLast} onClick={() => onMove(1)} className="underline underline-offset-4 disabled:opacity-30">
                Move down
              </button>
              <button onClick={() => setEditing(false)} className="ml-auto font-medium">
                Done
              </button>
            </div>
          )}
        </div>
      )}

      {expanded && (
        <ul id={listId} className="mb-1 ml-[1.35rem] border-l border-rule pl-2">
          {items.length === 0 ? (
            <li className="py-1 pl-1 text-caption text-ink-faint">Nothing here{active ? "" : " yet"}.</li>
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
        className="flex w-full items-center gap-2 rounded-md px-1.5 py-1 text-left text-caption text-ink-soft hover:bg-ink/4 hover:text-ink"
      >
        <span className="cap-first min-w-0 flex-1 truncate">{item.name}</span>
        {item.status === "want" && <Tag className="shrink-0">Want</Tag>}
      </button>
    </li>
  );
}

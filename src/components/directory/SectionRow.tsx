"use client";
import { useState } from "react";
import { useStore } from "@/lib/store";
import { ACCENT_HEX } from "@/lib/theme";
import type { Section, Accent } from "@/lib/types";

export default function SectionRow({
  section,
  active,
  onSelect,
}: {
  section: Section;
  active: boolean;
  onSelect: () => void;
}) {
  const updateSection = useStore((s) => s.updateSection);
  const deleteSection = useStore((s) => s.deleteSection);
  const moveItemToSection = useStore((s) => s.moveItemToSection);
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(section.name);
  const [over, setOver] = useState(false);

  const dot = section.color ? ACCENT_HEX[section.color as Accent] ?? section.color : "var(--ink-soft)";

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setOver(false);
        const id = e.dataTransfer.getData("text/item");
        if (id) moveItemToSection(id, section.id);
      }}
      className={
        "group flex items-center gap-2 rounded-lg px-2 py-1.5 text-[15px] lowercase transition " +
        (active ? "bg-ink/8 " : "hover:bg-ink/5 ") +
        (over ? "ring-1 ring-ink" : "")
      }
    >
      <span
        className="h-2 w-2 shrink-0 rounded-full"
        style={{ background: dot }}
        aria-hidden
      />
      {editing ? (
        <input
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          onBlur={() => {
            setEditing(false);
            if (name.trim() && name !== section.name) updateSection(section.id, { name: name.trim() });
          }}
          onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
          className="flex-1 rounded border border-rule bg-ground/40 px-1 outline-none"
        />
      ) : (
        <button onClick={onSelect} className="flex-1 text-left">
          {section.name}{" "}
          <span className="tabular text-ink-soft">({section.count ?? 0})</span>
        </button>
      )}

      <span className="ml-auto flex items-center gap-1 opacity-0 transition group-hover:opacity-100">
        <button
          onClick={() => setEditing(true)}
          className="text-xs text-ink-soft hover:text-ink"
          aria-label="rename section"
        >
          edit
        </button>
        <button
          onClick={() => deleteSection(section.id)}
          className="text-xs text-ink-soft hover:text-blush"
          aria-label="remove section"
        >
          ×
        </button>
      </span>
    </div>
  );
}

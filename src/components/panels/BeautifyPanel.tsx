"use client";
import { useState } from "react";
import { useStore } from "@/lib/store";
import { THEMES } from "@/lib/theme";
import { useDebounced } from "@/lib/hooks";
import Dialog, { SheetHeader } from "@/components/ui/Dialog";
import { Group, fieldClass } from "@/components/ui/controls";

const WARDROBE_ICONS = ["✦", "○", "♡", "✿", "◇", "☂", "⚙", "♪", "☀", "✂", "☾", "△"];

export default function BeautifyPanel() {
  const setPanel = useStore((s) => s.setPanel);
  const wardrobe = useStore((s) => s.payload?.wardrobe);
  const setTheme = useStore((s) => s.setTheme);
  const setTitle = useStore((s) => s.setTitle);

  const [title, setTitleDraft] = useState(wardrobe?.title ?? "");
  const [tagline, setTagline] = useState(wardrobe?.tagline ?? "");
  const saveTitle = useDebounced((patch: { title?: string; tagline?: string | null }) => setTitle(patch), 600);

  if (!wardrobe) return null;
  const close = () => setPanel(null);

  return (
    <Dialog title="beautify" variant="sheet" onClose={close} labelledBy="beautify-title">
      <SheetHeader id="beautify-title" title="beautify" onClose={close} />

      <Group label="theme">
        <div className="grid grid-cols-4 gap-2" role="radiogroup" aria-label="theme">
          {THEMES.map((t) => (
            <button
              key={t.id}
              role="radio"
              aria-checked={wardrobe.theme === t.id}
              onClick={() => setTheme(t.id)}
              className={
                "flex flex-col items-center gap-1 rounded-lg border p-2 text-[11px] lowercase " +
                (wardrobe.theme === t.id ? "border-ink" : "border-rule")
              }
            >
              <span className="h-8 w-full rounded border border-rule" style={{ background: t.swatch }} />
              {t.label}
            </button>
          ))}
        </div>
      </Group>

      <Group label="title + tagline">
        <div className="mb-2 flex flex-wrap gap-1" role="radiogroup" aria-label="wardrobe icon">
          {WARDROBE_ICONS.map((ic) => (
            <button
              key={ic}
              role="radio"
              aria-checked={(wardrobe.icon ?? "✦") === ic}
              aria-label={`icon ${ic}`}
              onClick={() => setTitle({ icon: ic })}
              className={"h-7 w-7 rounded-md text-sm " + ((wardrobe.icon ?? "✦") === ic ? "bg-ink text-panel" : "hover:bg-ink/5")}
            >
              {ic}
            </button>
          ))}
        </div>
        <input
          aria-label="title"
          value={title}
          maxLength={60}
          onChange={(e) => {
            setTitleDraft(e.target.value);
            if (e.target.value.trim()) saveTitle({ title: e.target.value.trim() });
          }}
          className={`${fieldClass} mb-2`}
        />
        <input
          aria-label="tagline"
          value={tagline}
          maxLength={120}
          onChange={(e) => {
            setTagline(e.target.value);
            saveTitle({ tagline: e.target.value || null });
          }}
          placeholder="tagline"
          className={fieldClass}
        />
      </Group>
    </Dialog>
  );
}

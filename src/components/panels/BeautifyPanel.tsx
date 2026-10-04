"use client";
import { useState } from "react";
import { useStore } from "@/lib/store";
import { THEMES } from "@/lib/theme";
import { useDebounced } from "@/lib/hooks";
import { cx } from "@/lib/cx";
import Dialog from "@/components/ui/Dialog";
import { FormField, Input } from "@/components/ui/Field";

const WARDROBE_ICONS = ["✦", "○", "♡", "✿", "◇", "☂", "⚙", "♪", "☀", "✂", "☾", "△"];

// How this wardrobe looks: its theme, its name and the mark shown in the switcher.
export default function BeautifyPanel() {
  const setPanel = useStore((s) => s.setPanel);
  const wardrobe = useStore((s) => s.payload?.wardrobe);
  const setTheme = useStore((s) => s.setTheme);
  const setTitle = useStore((s) => s.setTitle);

  const [title, setTitleDraft] = useState(wardrobe?.title ?? "");
  const [tagline, setTagline] = useState(wardrobe?.tagline ?? "");
  const saveTitle = useDebounced((patch: { title?: string; tagline?: string | null }) => setTitle(patch), 600);

  if (!wardrobe) return null;

  return (
    <Dialog title="Appearance" variant="sheet" onClose={() => setPanel(null)}>
      <FormField label="Theme">
        <div className="grid grid-cols-4 gap-2" role="radiogroup" aria-label="Theme">
          {THEMES.map((t) => {
            const on = wardrobe.theme === t.id;
            return (
              <button
                key={t.id}
                role="radio"
                aria-checked={on}
                onClick={() => setTheme(t.id)}
                className={cx(
                  "flex flex-col items-center gap-1.5 rounded-control border p-1.5 pb-1 text-caption capitalize transition",
                  on ? "border-ink" : "border-rule hover:border-rule-strong"
                )}
              >
                <span className="h-10 w-full rounded-md border border-rule" style={{ background: t.swatch }} />
                {t.label}
              </button>
            );
          })}
        </div>
      </FormField>

      <FormField label="Title" htmlFor="look-title" className="mt-6">
        <Input
          id="look-title"
          value={title}
          maxLength={60}
          onChange={(e) => {
            setTitleDraft(e.target.value);
            if (e.target.value.trim()) saveTitle({ title: e.target.value.trim() });
          }}
        />
      </FormField>

      <FormField label="Tagline" htmlFor="look-tagline" className="mt-4">
        <Input
          id="look-tagline"
          value={tagline}
          maxLength={120}
          onChange={(e) => {
            setTagline(e.target.value);
            saveTitle({ tagline: e.target.value || null });
          }}
          placeholder="Optional"
        />
      </FormField>

      <FormField label="Mark in the wardrobe list" className="mt-6">
        <div className="flex flex-wrap gap-1" role="radiogroup" aria-label="Mark in the wardrobe list">
          {WARDROBE_ICONS.map((ic) => {
            const on = (wardrobe.icon ?? "✦") === ic;
            return (
              <button
                key={ic}
                role="radio"
                aria-checked={on}
                aria-label={`Mark ${ic}`}
                onClick={() => setTitle({ icon: ic })}
                className={cx("h-8 w-8 rounded-md", on ? "bg-ink text-ground" : "hover:bg-ink/6")}
              >
                {ic}
              </button>
            );
          })}
        </div>
      </FormField>
    </Dialog>
  );
}

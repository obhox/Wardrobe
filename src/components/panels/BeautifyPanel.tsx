"use client";
import { useState } from "react";
import { useStore } from "@/lib/store";
import { GROUNDS, PATTERNS, ACCENTS, PRESETS } from "@/lib/theme";
import { isCustomGround } from "@/lib/ground";
import { STICKERS } from "@/lib/stickers";
import { useDebounced } from "@/lib/hooks";
import Dialog, { SheetHeader } from "@/components/ui/Dialog";
import { Group, Pill, fieldClass } from "@/components/ui/controls";
import StickerArt from "@/components/canvas/StickerArt";

const WARDROBE_ICONS = ["✦", "○", "♡", "✿", "◇", "☂", "⚙", "♪", "☀", "✂", "☾", "△"];

export default function BeautifyPanel() {
  const setPanel = useStore((s) => s.setPanel);
  const wardrobe = useStore((s) => s.payload?.wardrobe);
  const setTheme = useStore((s) => s.setTheme);
  const setTitle = useStore((s) => s.setTitle);
  const addSticker = useStore((s) => s.addSticker);

  const [title, setTitleDraft] = useState(wardrobe?.title ?? "");
  const [tagline, setTagline] = useState(wardrobe?.tagline ?? "");
  const saveTitle = useDebounced((patch: { title?: string; tagline?: string | null }) => setTitle(patch), 600);
  const saveHex = useDebounced((hex: string) => setTheme({ ground: hex as `#${string}` }), 250);

  if (!wardrobe) return null;
  const { theme } = wardrobe;
  const close = () => setPanel(null);
  const custom = isCustomGround(theme.ground);

  return (
    <Dialog title="beautify" variant="sheet" onClose={close} labelledBy="beautify-title">
      <SheetHeader id="beautify-title" title="beautify" onClose={close} />

      <Group label="ground">
        <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="ground">
          {GROUNDS.map((g) => (
            <button
              key={g.id}
              role="radio"
              aria-checked={theme.ground === g.id}
              onClick={() => setTheme({ ground: g.id })}
              className={
                "flex flex-col items-center gap-1 rounded-lg border p-2 text-[11px] lowercase " +
                (theme.ground === g.id ? "border-ink" : "border-rule")
              }
            >
              <span className="h-8 w-full rounded" style={{ background: g.swatch }} />
              {g.label}
            </button>
          ))}
        </div>
        <label className="mt-2 flex items-center gap-3 rounded-lg border border-rule p-2 text-[11px] lowercase text-ink-soft">
          <input
            type="color"
            value={custom ? theme.ground : "#c9b8e8"}
            onChange={(e) => saveHex(e.target.value)}
            className="h-8 w-12 cursor-pointer rounded border-0 bg-transparent p-0"
            aria-label="custom ground colour"
          />
          <span className={custom ? "text-ink" : ""}>
            {custom ? `custom ${theme.ground}` : "any colour — ink and shadow adjust to stay readable"}
          </span>
        </label>
      </Group>

      <Group label="pattern">
        <div className="flex flex-wrap gap-1.5">
          {PATTERNS.map((p) => (
            <Pill key={p.id} on={theme.pattern === p.id} onClick={() => setTheme({ pattern: p.id })}>
              {p.label}
            </Pill>
          ))}
        </div>
      </Group>

      <Group label="accent — pins, badges and highlights">
        <div className="flex gap-2" role="radiogroup" aria-label="accent">
          {ACCENTS.map((a) => (
            <button
              key={a.id}
              role="radio"
              aria-checked={theme.accent === a.id}
              onClick={() => setTheme({ accent: a.id })}
              aria-label={a.id}
              className={"h-7 w-7 rounded-full border-2 " + (theme.accent === a.id ? "border-ink" : "border-transparent")}
              style={{ background: a.hex }}
            />
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

      <Group label="stickers">
        <div className="flex flex-wrap gap-2">
          {STICKERS.map((s) => (
            <button
              key={s.kind}
              onClick={() => addSticker(s.kind)}
              className="flex h-11 min-w-11 items-center justify-center overflow-hidden rounded-lg border border-rule px-2 hover:bg-ink/5"
              aria-label={`add ${s.label}`}
              title={`add ${s.label}`}
            >
              <span className="pointer-events-none origin-center scale-[0.7]">
                <StickerArt kind={s.kind} />
              </span>
            </button>
          ))}
        </div>
        <p className="mt-2 text-[11px] lowercase text-ink-soft">
          drag stickers anywhere. hover or tab to one for rotate, size and remove.
        </p>
      </Group>

      <Group label="themes">
        <div className="grid grid-cols-2 gap-2">
          {PRESETS.map((p) => (
            <button
              key={p.id}
              onClick={() => setTheme({ ground: p.ground, pattern: p.pattern, accent: p.accent })}
              className="flex items-center gap-2 rounded-lg border border-rule px-2 py-2 text-xs lowercase hover:bg-ink/5"
            >
              <span aria-hidden className="h-4 w-4 rounded-full border border-rule" style={{ background: GROUNDS.find((g) => g.id === p.ground)?.swatch }} />
              {p.label}
            </button>
          ))}
        </div>
      </Group>
    </Dialog>
  );
}

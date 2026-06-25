"use client";
import { motion } from "framer-motion";
import { useStore } from "@/lib/store";
import { GROUNDS, PATTERNS, ACCENTS, PRESETS } from "@/lib/theme";
import type { StickerKind } from "@/lib/types";

const STICKERS: { kind: StickerKind; glyph: string }[] = [
  { kind: "star", glyph: "✦" },
  { kind: "cat", glyph: "ฅ^•ﻌ•^ฅ" },
  { kind: "scribble", glyph: "〜" },
  { kind: "washi", glyph: "▰▱▰" },
  { kind: "shrug", glyph: "¯\\_(ツ)_/¯" },
];

export default function BeautifyPanel() {
  const setPanel = useStore((s) => s.setPanel);
  const wardrobe = useStore((s) => s.payload?.wardrobe);
  const setTheme = useStore((s) => s.setTheme);
  const setTitle = useStore((s) => s.setTitle);
  const addSticker = useStore((s) => s.addSticker);

  if (!wardrobe) return null;
  const { theme } = wardrobe;

  return (
    <div className="fixed inset-0 z-[55]" onClick={() => setPanel(null)}>
      <motion.aside
        initial={{ x: 360 }}
        animate={{ x: 0 }}
        exit={{ x: 360 }}
        transition={{ type: "spring", stiffness: 320, damping: 34 }}
        onClick={(e) => e.stopPropagation()}
        className="thin-scroll absolute right-0 top-0 h-full w-[330px] overflow-y-auto border-l border-rule bg-panel p-5 shadow-[-12px_0_40px_var(--shadow)]"
      >
        <div className="flex items-center justify-between">
          <h2 className="font-[family-name:var(--font-display)] text-lg lowercase">beautify</h2>
          <button onClick={() => setPanel(null)} className="text-sm lowercase text-ink-soft">close ×</button>
        </div>

        <Section label="ground">
          <div className="grid grid-cols-3 gap-2">
            {GROUNDS.map((g) => (
              <button
                key={g.id}
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
        </Section>

        <Section label="pattern">
          <div className="flex flex-wrap gap-1.5">
            {PATTERNS.map((p) => (
              <Pill key={p.id} on={theme.pattern === p.id} onClick={() => setTheme({ pattern: p.id })}>
                {p.label}
              </Pill>
            ))}
          </div>
        </Section>

        <Section label="accent">
          <div className="flex gap-2">
            {ACCENTS.map((a) => (
              <button
                key={a.id}
                onClick={() => setTheme({ accent: a.id })}
                aria-label={a.id}
                className={
                  "h-7 w-7 rounded-full border-2 " +
                  (theme.accent === a.id ? "border-ink" : "border-transparent")
                }
                style={{ background: a.hex }}
              />
            ))}
          </div>
        </Section>

        <Section label="title + tagline">
          <input
            value={wardrobe.title}
            onChange={(e) => setTitle(e.target.value, wardrobe.tagline ?? undefined)}
            className="mb-2 w-full rounded-lg border border-rule bg-ground/40 px-3 py-2 text-sm lowercase outline-none"
          />
          <input
            value={wardrobe.tagline ?? ""}
            onChange={(e) => setTitle(wardrobe.title, e.target.value)}
            placeholder="tagline"
            className="w-full rounded-lg border border-rule bg-ground/40 px-3 py-2 text-sm lowercase outline-none"
          />
        </Section>

        <Section label="stickers">
          <div className="flex flex-wrap gap-2">
            {STICKERS.map((s) => (
              <button
                key={s.kind}
                onClick={() => addSticker(s.kind)}
                className="rounded-lg border border-rule px-2 py-1.5 text-sm hover:bg-ink/5"
                title={`add ${s.kind}`}
              >
                {s.glyph}
              </button>
            ))}
          </div>
          <p className="mt-1 text-[11px] lowercase text-ink-soft">double-click a sticker on the canvas to remove it.</p>
        </Section>

        <Section label="themes">
          <div className="grid grid-cols-2 gap-2">
            {PRESETS.map((p) => (
              <button
                key={p.id}
                onClick={() => setTheme({ ground: p.ground, pattern: p.pattern, accent: p.accent })}
                className="rounded-lg border border-rule px-2 py-2 text-xs lowercase hover:bg-ink/5"
              >
                {p.label}
              </button>
            ))}
          </div>
        </Section>
      </motion.aside>
    </div>
  );
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mt-6">
      <div className="mb-2 text-xs lowercase text-ink-soft">{label}</div>
      {children}
    </div>
  );
}

function Pill({ on, children, onClick }: { on: boolean; children: React.ReactNode; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={"rounded-full px-2.5 py-1 text-xs lowercase " + (on ? "bg-ink text-panel" : "border border-rule hover:bg-ink/5")}
    >
      {children}
    </button>
  );
}

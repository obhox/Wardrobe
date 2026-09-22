"use client";

// How much you want it: 1–3 marks (brief §8 "priority"). Click again to clear.
const LABELS = ["someday", "soon", "must have"];

export default function Priority({
  value,
  onChange,
}: {
  value: number | null | undefined;
  onChange: (v: number | null) => void;
}) {
  return (
    <span className="inline-flex items-center gap-1" role="radiogroup" aria-label="priority">
      {LABELS.map((label, i) => {
        const n = i + 1;
        const on = (value ?? 0) >= n;
        return (
          <button
            key={n}
            type="button"
            role="radio"
            aria-checked={value === n}
            aria-label={label}
            title={label}
            onClick={() => onChange(value === n ? null : n)}
            className={"text-base leading-none transition " + (on ? "text-ink" : "text-ink-soft/40 hover:text-ink-soft")}
          >
            ✦
          </button>
        );
      })}
      {value ? <span className="ml-1 text-[11px] text-ink-soft">{LABELS[value - 1]}</span> : null}
    </span>
  );
}

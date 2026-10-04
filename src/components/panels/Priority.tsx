"use client";
import { Star } from "lucide-react";
import { cx } from "@/lib/cx";

// How much you want it: 1–3 marks (brief §8 "priority"). Click again to clear.
const LABELS = ["Someday", "Soon", "Must have"];

export default function Priority({
  value,
  onChange,
}: {
  value: number | null | undefined;
  onChange: (v: number | null) => void;
}) {
  return (
    <span className="inline-flex items-center" role="radiogroup" aria-label="Priority">
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
            className="flex h-8 w-7 items-center justify-center"
          >
            <Star aria-hidden className={cx("h-4 w-4 transition", on ? "fill-ink text-ink" : "text-ink-faint hover:text-ink-soft")} />
          </button>
        );
      })}
      {value ? <span className="ml-1.5 text-caption text-ink-soft">{LABELS[value - 1]}</span> : null}
    </span>
  );
}

import { cx } from "@/lib/cx";

/** An on/off setting with its label on the left. */
export function Switch({
  on,
  onChange,
  label,
  disabled,
}: {
  on: boolean;
  onChange: (v: boolean) => void;
  label: React.ReactNode;
  disabled?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-caption text-ink-soft">{label}</span>
      <button
        type="button"
        role="switch"
        aria-checked={on}
        disabled={disabled}
        onClick={() => onChange(!on)}
        className={cx(
          "relative h-6 w-11 shrink-0 rounded-full transition disabled:opacity-50",
          on ? "bg-ink" : "bg-rule-strong"
        )}
      >
        <span
          className={cx(
            "absolute top-0.5 h-5 w-5 rounded-full bg-panel shadow-control transition-all",
            on ? "left-[1.375rem]" : "left-0.5"
          )}
        />
      </button>
    </div>
  );
}

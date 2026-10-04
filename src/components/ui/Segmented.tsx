import { cx } from "@/lib/cx";

/** Pick one of a few options, side by side: owned / want, collage / board. */
export function Segmented<T extends string>({
  value,
  onChange,
  options,
  label,
  className,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: React.ReactNode }[];
  label: string;
  className?: string;
}) {
  return (
    <div role="radiogroup" aria-label={label} className={cx("inline-flex rounded-control bg-wash p-0.5", className)}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          onClick={() => onChange(o.value)}
          className={cx(
            "h-8 flex-1 whitespace-nowrap rounded-[0.5rem] px-3 text-caption font-medium transition",
            value === o.value ? "bg-panel text-ink shadow-control" : "text-ink-soft hover:text-ink"
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

import { cx } from "@/lib/cx";

/** A pill that toggles: filters, sizes, quick choices. */
export function Chip({
  on,
  className,
  type = "button",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { on: boolean }) {
  return (
    <button
      type={type}
      aria-pressed={on}
      {...props}
      className={cx(
        "inline-flex h-8 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border px-3 text-caption transition",
        on ? "border-ink bg-ink text-ground" : "border-rule-strong bg-panel/70 text-ink hover:bg-wash",
        className
      )}
    />
  );
}

/** A small mono tag on the accent colour, e.g. "Want" on a tile. */
export function Tag({ className, ...props }: React.HTMLAttributes<HTMLSpanElement>) {
  return <span {...props} className={cx("accent-pin label-caps rounded-full px-2 py-0.5", className)} />;
}

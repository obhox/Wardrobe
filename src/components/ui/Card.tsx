import { cx } from "@/lib/cx";

/** A raised surface with a hairline edge. */
export function Card({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div {...props} className={cx("rounded-card border border-rule bg-panel", className)} />;
}

/** A placeholder block that shimmers while something loads. */
export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden className={cx("shimmer rounded-control", className)} />;
}

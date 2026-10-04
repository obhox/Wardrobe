import { cx } from "@/lib/cx";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md" | "lg";

const BASE =
  "inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-control font-medium transition disabled:pointer-events-none disabled:opacity-40";

const VARIANT: Record<Variant, string> = {
  primary: "bg-ink text-ground hover:opacity-90",
  secondary: "border border-rule-strong bg-panel text-ink hover:bg-wash",
  ghost: "text-ink-soft hover:bg-ink/6 hover:text-ink",
  danger: "bg-danger text-white hover:opacity-90",
};

const SIZE: Record<Size, string> = {
  sm: "h-8 px-3 text-caption",
  md: "h-10 px-4 text-sm",
  lg: "h-12 px-6 text-body",
};

const ICON_SIZE: Record<Size, string> = { sm: "h-8 w-8", md: "h-10 w-10", lg: "h-12 w-12" };

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: Size };

/** The one button. `primary` for the main action of a view, `secondary` for
 *  the rest, `ghost` for quiet toolbar actions, `danger` to remove things. */
export function Button({ variant = "secondary", size = "md", className, type = "button", ...props }: ButtonProps) {
  return <button type={type} {...props} className={cx(BASE, VARIANT[variant], SIZE[size], className)} />;
}

/** A square button holding only an icon; `label` names it for screen readers. */
export function IconButton({
  label,
  variant = "ghost",
  size = "md",
  className,
  type = "button",
  ...props
}: Omit<ButtonProps, "aria-label"> & { label: string }) {
  return (
    <button
      type={type}
      aria-label={label}
      title={label}
      {...props}
      className={cx(BASE, VARIANT[variant], ICON_SIZE[size], className)}
    />
  );
}

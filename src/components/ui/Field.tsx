import { ChevronDown } from "lucide-react";
import { cx } from "@/lib/cx";

// 16px on phones so iOS doesn't zoom the page on focus; 14px from tablet up.
export const fieldClass =
  "w-full min-w-0 rounded-control border border-rule-strong bg-panel px-3 text-base text-ink transition-colors placeholder:text-ink-faint hover:border-ink/60 focus:border-ink disabled:opacity-50 sm:text-sm";

export function Input({ className, ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={cx(fieldClass, "h-10", className)} />;
}

export function Textarea({ className, ...props }: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={cx(fieldClass, "resize-none py-2", className)} />;
}

export function Select({
  className,
  wrapperClassName,
  children,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement> & { wrapperClassName?: string }) {
  return (
    <div className={cx("relative flex items-center", wrapperClassName)}>
      <select {...props} className={cx(fieldClass, "h-10 cursor-pointer appearance-none pr-9", className)}>
        {children}
      </select>
      <ChevronDown aria-hidden className="pointer-events-none absolute right-3 h-4 w-4 text-ink-soft" />
    </div>
  );
}

export function FieldLabel({ className, ...props }: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return <label {...props} className={cx("label-caps mb-1.5 block text-ink-soft", className)} />;
}

/** A control with its small label above. Give `htmlFor` for a single input;
 *  leave it out when the label names a group of controls. */
export function FormField({
  label,
  htmlFor,
  className,
  children,
}: {
  label: React.ReactNode;
  htmlFor?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={className}>
      {htmlFor ? (
        <FieldLabel htmlFor={htmlFor}>{label}</FieldLabel>
      ) : (
        <div className="label-caps mb-1.5 text-ink-soft">{label}</div>
      )}
      {children}
    </div>
  );
}

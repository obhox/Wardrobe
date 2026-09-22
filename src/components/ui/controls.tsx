"use client";

// Small shared form controls, all in the brand's quiet monospace style.

export function Pill({
  on,
  children,
  onClick,
  title,
}: {
  on: boolean;
  children: React.ReactNode;
  onClick: () => void;
  title?: string;
}) {
  return (
    <button
      type="button"
      aria-pressed={on}
      title={title}
      onClick={onClick}
      className={
        "rounded-full px-3 py-1.5 text-xs lowercase transition sm:px-2.5 sm:py-1 " +
        (on ? "bg-ink text-panel" : "border border-rule hover:bg-ink/5")
      }
    >
      {children}
    </button>
  );
}

export function Toggle({
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
      <span className="text-xs lowercase text-ink-soft">{label}</span>
      <button
        type="button"
        role="switch"
        aria-checked={on}
        disabled={disabled}
        onClick={() => onChange(!on)}
        className={
          "relative h-6 w-11 shrink-0 rounded-full transition disabled:opacity-50 " +
          (on ? "bg-ink" : "bg-rule")
        }
      >
        <span
          className={
            "absolute top-0.5 h-5 w-5 rounded-full bg-panel shadow transition-all " +
            (on ? "left-[1.375rem]" : "left-0.5")
          }
        />
      </button>
    </div>
  );
}

export const fieldClass =
  "w-full min-w-0 rounded-lg border border-rule bg-ground/40 px-3 py-2 text-base lowercase outline-none placeholder:text-ink-soft/60 focus:border-ink sm:text-sm";

export function Field(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`${fieldClass} ${props.className ?? ""}`} />;
}

export function Label({ children, htmlFor }: { children: React.ReactNode; htmlFor?: string }) {
  return (
    <label htmlFor={htmlFor} className="mb-1.5 block text-xs lowercase text-ink-soft">
      {children}
    </label>
  );
}

export function Group({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <section className="mt-6">
      <h3 className="mb-2 text-xs font-normal lowercase text-ink-soft">{label}</h3>
      {children}
    </section>
  );
}

export function PrimaryButton(props: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      {...props}
      className={
        "rounded-xl bg-ink px-4 py-2.5 text-sm lowercase text-panel transition hover:opacity-90 disabled:opacity-40 " +
        (props.className ?? "")
      }
    />
  );
}

export function QuietButton(props: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      {...props}
      className={
        "rounded-xl border border-rule px-4 py-2.5 text-sm lowercase transition hover:bg-ink/5 disabled:opacity-40 " +
        (props.className ?? "")
      }
    />
  );
}

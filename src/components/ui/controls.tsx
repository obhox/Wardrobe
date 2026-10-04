"use client";
import { Button } from "./Button";
import { Chip } from "./Chip";
import { FieldLabel, Input, fieldClass as kitFieldClass } from "./Field";
import { Switch } from "./Switch";

// Older names for the kit in ./Button, ./Field, ./Chip and ./Switch, kept so
// panels that have not been restyled yet keep compiling. New code imports the
// kit directly.

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
    <Chip on={on} onClick={onClick} title={title}>
      {children}
    </Chip>
  );
}

export const Toggle = Switch;

export const fieldClass = `${kitFieldClass} h-10`;

export const Field = Input;

export const Label = FieldLabel;

export function Group({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <section className="mt-6">
      <h3 className="label-caps mb-2 text-ink-soft">{label}</h3>
      {children}
    </section>
  );
}

export function PrimaryButton(props: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return <Button variant="primary" {...props} />;
}

export function QuietButton(props: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return <Button variant="secondary" {...props} />;
}

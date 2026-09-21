"use client";
import { useState } from "react";
import { CURRENCIES, CUSTOM_SYMBOL_MAX, DEFAULT_CURRENCY, isPresetCurrency } from "@/lib/currency";

// Dropdown of common currencies plus a "custom" option that lets the user type
// their own symbol (e.g. "R", "KSh", "₹").
export default function CurrencyPicker({
  value,
  onChange,
  className = "",
}: {
  value: string | null | undefined;
  onChange: (v: string) => void;
  className?: string;
}) {
  const current = value || DEFAULT_CURRENCY;
  // stay in custom mode while the symbol box is empty, even though an empty
  // value would otherwise fall back to the default preset
  const [forceCustom, setForceCustom] = useState(false);
  const custom = forceCustom || !isPresetCurrency(current);

  return (
    <div className={"flex gap-1.5 " + className}>
      <select
        aria-label="currency"
        value={custom ? "__custom" : current}
        onChange={(e) => {
          if (e.target.value === "__custom") {
            setForceCustom(true);
            onChange(isPresetCurrency(current) ? "" : current);
          } else {
            setForceCustom(false);
            onChange(e.target.value);
          }
        }}
        className="rounded-lg border border-rule bg-ground/40 px-2 py-1 text-sm outline-none"
      >
        {CURRENCIES.map((c) => (
          <option key={c.code} value={c.code}>
            {c.symbol} {c.code}
          </option>
        ))}
        <option value="__custom">custom…</option>
      </select>
      {custom && (
        <input
          autoFocus
          value={value ?? ""}
          maxLength={CUSTOM_SYMBOL_MAX}
          onChange={(e) => onChange(e.target.value)}
          placeholder="symbol"
          aria-label="currency symbol"
          className="w-20 rounded-lg border border-rule bg-ground/40 px-2 py-1 text-sm outline-none placeholder:text-ink-soft/60 focus:border-ink"
        />
      )}
    </div>
  );
}

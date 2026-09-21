"use client";
import { useState } from "react";
import {
  CURRENCIES,
  CUSTOM_SYMBOL_MAX,
  DEFAULT_CURRENCY,
  currencySymbol,
  isPresetCurrency,
} from "@/lib/currency";

// One bordered field: [₦ NGN ▾ | amount]. Picking "custom…" swaps in a small
// symbol box inside the same field, so the row never changes shape.
// `lockCurrency` shows the symbol as a fixed prefix (e.g. for target price).
export default function PriceField({
  currency,
  onCurrency,
  amount,
  onAmount,
  placeholder = "price",
  size = "md",
  lockCurrency = false,
  className = "",
}: {
  currency: string | null | undefined;
  onCurrency?: (v: string) => void;
  amount: string;
  onAmount: (v: string) => void;
  placeholder?: string;
  size?: "sm" | "md";
  lockCurrency?: boolean;
  className?: string;
}) {
  const current = currency || DEFAULT_CURRENCY;
  // stay in custom mode while the symbol box is empty, even though an empty
  // value would otherwise fall back to the default preset
  const [forceCustom, setForceCustom] = useState(false);
  const custom = forceCustom || !isPresetCurrency(current);
  const py = size === "sm" ? "py-1.5" : "py-2";

  return (
    <div
      className={
        "flex min-w-0 items-stretch overflow-hidden rounded-lg border border-rule bg-ground/40 text-sm focus-within:border-ink " +
        className
      }
    >
      {lockCurrency || !onCurrency ? (
        <span className={`flex items-center border-r border-rule px-3 ${py} text-ink-soft`}>
          {currencySymbol(currency)}
        </span>
      ) : (
        <>
          <div className="relative flex shrink-0 items-center border-r border-rule">
            <select
              aria-label="currency"
              value={custom ? "__custom" : current}
              onChange={(e) => {
                if (e.target.value === "__custom") {
                  setForceCustom(true);
                  onCurrency(isPresetCurrency(current) ? "" : current);
                } else {
                  setForceCustom(false);
                  onCurrency(e.target.value);
                }
              }}
              className={`h-full cursor-pointer appearance-none bg-transparent pl-3 pr-7 ${py} outline-none`}
            >
              {CURRENCIES.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.symbol} {c.code}
                </option>
              ))}
              <option value="__custom">custom</option>
            </select>
            <Chevron />
          </div>
          {custom && (
            <input
              autoFocus
              value={currency ?? ""}
              maxLength={CUSTOM_SYMBOL_MAX}
              onChange={(e) => onCurrency(e.target.value)}
              placeholder="symbol"
              aria-label="currency symbol"
              className={`w-16 shrink-0 border-r border-rule bg-transparent px-2 ${py} text-center outline-none placeholder:text-ink-soft/60`}
            />
          )}
        </>
      )}
      <input
        type="number"
        inputMode="decimal"
        min={0}
        step="any"
        value={amount}
        onChange={(e) => onAmount(e.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        className={`w-full min-w-0 flex-1 bg-transparent px-3 ${py} lowercase outline-none placeholder:text-ink-soft/60`}
      />
    </div>
  );
}

export function Chevron() {
  return (
    <svg
      aria-hidden
      viewBox="0 0 12 12"
      className="pointer-events-none absolute right-2.5 h-3 w-3 text-ink-soft"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M3 4.5 6 7.5 9 4.5" />
    </svg>
  );
}

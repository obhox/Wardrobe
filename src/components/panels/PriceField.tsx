"use client";
import { ChevronDown } from "lucide-react";
import { CURRENCIES, DEFAULT_CURRENCY, currencySymbol, isPresetCurrency } from "@/lib/currency";
import { cx } from "@/lib/cx";

// One bordered field: [₦ NGN ▾ | amount].
// `lockCurrency` shows the symbol as a fixed prefix (e.g. for target price).
export default function PriceField({
  id,
  label,
  currency,
  onCurrency,
  amount,
  onAmount,
  lockCurrency = false,
  className,
}: {
  id?: string;
  /** names the amount for screen readers */
  label: string;
  currency: string | null | undefined;
  onCurrency?: (v: string) => void;
  amount: string;
  onAmount: (v: string) => void;
  lockCurrency?: boolean;
  className?: string;
}) {
  const current = currency || DEFAULT_CURRENCY;

  return (
    <div
      className={cx(
        "flex h-10 min-w-0 items-stretch overflow-hidden rounded-control border border-rule-strong bg-panel text-base transition-colors focus-within:border-ink focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-ink hover:border-ink/60 sm:text-sm",
        className
      )}
    >
      {lockCurrency || !onCurrency ? (
        <span className="flex items-center border-r border-rule px-3 font-mono text-ink-soft">{currencySymbol(currency)}</span>
      ) : (
        <div className="relative flex shrink-0 items-center border-r border-rule">
          <select
            aria-label="Currency"
            value={current}
            onChange={(e) => onCurrency(e.target.value)}
            className="h-full cursor-pointer appearance-none bg-transparent pl-3 pr-7 font-mono outline-none focus-visible:bg-ink/6"
          >
            {CURRENCIES.map((c) => (
              <option key={c.code} value={c.code}>
                {c.symbol} {c.code}
              </option>
            ))}
            {/* keep a non-listed currency (e.g. INR from an imported page, or an
                older custom symbol) selectable so it isn't silently changed */}
            {!isPresetCurrency(current) && (
              <option value={current}>
                {currencySymbol(current) === current ? current : `${currencySymbol(current)} ${current}`}
              </option>
            )}
          </select>
          <ChevronDown aria-hidden className="pointer-events-none absolute right-2 h-3.5 w-3.5 text-ink-soft" />
        </div>
      )}
      <input
        id={id}
        type="number"
        inputMode="decimal"
        min={0}
        step="any"
        value={amount}
        onChange={(e) => onAmount(e.target.value)}
        placeholder="0"
        aria-label={label}
        className="price w-full min-w-0 flex-1 bg-transparent px-3 outline-none placeholder:text-ink-faint"
      />
    </div>
  );
}

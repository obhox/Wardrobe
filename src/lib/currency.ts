// Currencies offered in the picker. `Item.currency` stores one of these ISO
// codes, or another ISO code picked up from an imported page. Older items may
// hold a free-text symbol from before custom currencies were removed.

export const CURRENCIES = [
  { code: "USD", symbol: "$", label: "us dollar" },
  { code: "NGN", symbol: "₦", label: "naira" },
  { code: "EUR", symbol: "€", label: "euro" },
  { code: "GBP", symbol: "£", label: "pound" },
  { code: "JPY", symbol: "¥", label: "yen" },
  { code: "CNY", symbol: "CN¥", label: "yuan" },
] as const;

export const DEFAULT_CURRENCY = "USD";

const LAST_KEY = "wardrobe:last-currency";

export function isPresetCurrency(value?: string | null) {
  return !!value && CURRENCIES.some((c) => c.code === value);
}

// Currency to pre-select for a new item: whatever the user picked last.
export function lastCurrency(): string {
  try {
    return localStorage.getItem(LAST_KEY) || DEFAULT_CURRENCY;
  } catch {
    return DEFAULT_CURRENCY;
  }
}

export function rememberCurrency(value: string) {
  try {
    localStorage.setItem(LAST_KEY, value);
  } catch {
    /* ignore */
  }
}

// The short prefix shown next to a price input.
export function currencySymbol(value?: string | null): string {
  const cur = value || DEFAULT_CURRENCY;
  const preset = CURRENCIES.find((c) => c.code === cur);
  if (preset) return preset.symbol;
  if (/^[A-Z]{3}$/.test(cur)) {
    try {
      const part = new Intl.NumberFormat(undefined, {
        style: "currency",
        currency: cur,
        currencyDisplay: "narrowSymbol",
      })
        .formatToParts(0)
        .find((p) => p.type === "currency");
      if (part) return part.value;
    } catch {
      /* not a real ISO code — fall through and treat as a symbol */
    }
  }
  return cur;
}

export function formatMoney(price?: number | null, currency?: string | null): string | null {
  if (price == null) return null;
  const cur = currency || DEFAULT_CURRENCY;
  if (/^[A-Z]{3}$/.test(cur)) {
    try {
      const preset = CURRENCIES.find((c) => c.code === cur);
      return new Intl.NumberFormat(undefined, {
        style: "currency",
        currency: cur,
        currencyDisplay: "narrowSymbol",
        maximumFractionDigits: 2,
      })
        .formatToParts(price)
        // use our own symbol for presets so e.g. yuan (CN¥) and yen (¥) differ
        .map((p) => (p.type === "currency" && preset ? preset.symbol : p.value))
        .join("");
    } catch {
      /* not a real ISO code — treat as a custom symbol */
    }
  }
  const amount = new Intl.NumberFormat(undefined, {
    minimumFractionDigits: Number.isInteger(price) ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(price);
  // "KSh 5,000" reads better than "KSh5,000"; "R5,000" / "₹5,000" stay tight
  return /\p{L}{2,}$/u.test(cur) ? `${cur} ${amount}` : `${cur}${amount}`;
}

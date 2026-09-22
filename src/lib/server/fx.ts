import "server-only";
import { safeFetch } from "./safe-fetch";

// Exchange rates for stats totals. Free, keyless daily rates (covers NGN and
// friends, which ECB-based feeds don't). Cached in memory for 12 hours; if the
// feed is down, totals simply skip what can't be converted.

type Rates = Record<string, number>; // units of X per 1 USD
let cached: { at: number; rates: Rates } | null = null;
const TTL = 12 * 60 * 60 * 1000;

async function usdRates(): Promise<Rates | null> {
  if (cached && Date.now() - cached.at < TTL) return cached.rates;
  try {
    const res = await safeFetch("https://open.er-api.com/v6/latest/USD", {
      accept: "application/json",
      maxBytes: 200_000,
      timeoutMs: 6_000,
    });
    if (!res.ok) return cached?.rates ?? null;
    const body = JSON.parse(res.body.toString("utf8")) as { result?: string; rates?: Rates };
    if (body.result !== "success" || !body.rates) return cached?.rates ?? null;
    cached = { at: Date.now(), rates: body.rates };
    return body.rates;
  } catch {
    return cached?.rates ?? null;
  }
}

// Currencies that don't use minor units — rounding to 2dp would look wrong.
const ZERO_DECIMAL = new Set([
  "JPY", "KRW", "VND", "CLP", "ISK", "UGX", "RWF", "XOF", "XAF", "KMF", "DJF", "GNF", "MGA", "PYG", "VUV",
]);

export function normalizeCurrency(code: string | null | undefined): string | null {
  const c = code?.trim().toUpperCase();
  return c && /^[A-Z]{3}$/.test(c) ? c : null;
}

export function roundMoney(amount: number, currency: string | null | undefined): number {
  return ZERO_DECIMAL.has(normalizeCurrency(currency) ?? "")
    ? Math.round(amount)
    : Math.round(amount * 100) / 100;
}

/**
 * Convert between two currencies. Strict: returns null when either code is
 * missing or unknown, or the rates feed is unreachable — price tracking must
 * never silently compare naira against dollars.
 */
export async function convertAmount(
  amount: number,
  from: string | null | undefined,
  to: string | null | undefined
): Promise<number | null> {
  const src = normalizeCurrency(from);
  const dst = normalizeCurrency(to);
  if (!src || !dst) return null;
  if (src === dst) return amount;
  const rates = await usdRates();
  if (!rates?.[src] || !rates[dst]) return null;
  return roundMoney((amount / rates[src]) * rates[dst], dst);
}

export interface Converter {
  (amount: number, from: string | null | undefined): number | null;
}

export async function converterTo(target: string): Promise<Converter> {
  const rates = await usdRates();
  return (amount, from) => {
    const src = from && /^[A-Z]{3}$/.test(from) ? from : "USD";
    if (src === target) return amount;
    if (!rates || !rates[src] || !rates[target]) return null;
    return (amount / rates[src]) * rates[target];
  };
}

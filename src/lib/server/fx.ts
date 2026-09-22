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

import "server-only";
import { prisma } from "@/lib/db";
import type { Item } from "@prisma/client";
import { convertAmount, normalizeCurrency, roundMoney } from "./fx";

// Switching an item's currency keeps what it is worth, not the digits: a
// ₦138,000 jacket relabelled to USD becomes $92, and its price history moves
// with it, so the sparkline, the lowest price and the target stay comparable.
// `relabel` keeps the numbers instead (for a currency that was simply wrong).

export interface CurrencySwitch {
  changed: boolean;
  converted: boolean;
  from: string | null;
  to: string;
  data: Partial<Pick<Item, "currency" | "price" | "targetPrice" | "lowestPrice">>;
  /** apply after the item row is updated */
  applyHistory?: () => Promise<void>;
}

export async function switchCurrency(
  item: Item,
  requested: string,
  { relabel = false }: { relabel?: boolean } = {}
): Promise<CurrencySwitch> {
  const to = normalizeCurrency(requested) ?? requested.trim().toUpperCase();
  const from = normalizeCurrency(item.currency);
  const none = { changed: false, converted: false, from, to, data: {} as CurrencySwitch["data"] };
  if (!to || to === from) return none;

  const data: CurrencySwitch["data"] = { currency: to };
  if (relabel || !from) return { changed: true, converted: false, from, to, data };

  const amounts = [item.price, item.targetPrice, item.lowestPrice];
  const rate = await convertAmount(1, from, to);
  if (rate == null) {
    // rates unavailable / unknown code — relabel rather than invent a number
    return { changed: true, converted: false, from, to, data };
  }

  const [price, targetPrice, lowestPrice] = amounts.map((v) =>
    v == null ? null : roundMoney(v * rate, to)
  );
  Object.assign(data, { price, targetPrice, lowestPrice });

  return {
    changed: true,
    converted: true,
    from,
    to,
    data,
    applyHistory: async () => {
      // one factor for the whole history: every snapshot was in `from`
      await prisma.$executeRaw`
        UPDATE "PriceSnapshot"
        SET "price" = ROUND(("price" * ${rate})::numeric, 2)::double precision,
            "currency" = ${to},
            "sourcePrice"   = COALESCE("sourcePrice", "price"),
            "sourceCurrency" = COALESCE("sourceCurrency", ${from})
        WHERE "itemId" = ${item.id}`;
    },
  };
}

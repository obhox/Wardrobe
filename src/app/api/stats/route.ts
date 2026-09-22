import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { wardrobeScope } from "@/lib/server/scope";
import { converterTo } from "@/lib/server/fx";
import { json, notFound, unauthorized } from "@/lib/server/http";
import type { StatsBucket, WardrobeStats } from "@/lib/types";

export const dynamic = "force-dynamic";

// GET ?w=<wardrobeId>[&currency=EUR] → totals and breakdowns for one wardrobe,
// with every price converted into one display currency.
export async function GET(req: NextRequest) {
  const { user, wardrobeId } = await wardrobeScope(req);
  if (!user) return unauthorized();
  if (!wardrobeId) return notFound();

  const q = req.nextUrl.searchParams.get("currency");
  const currency = q && /^[A-Z]{3}$/.test(q) ? q : user.displayCurrency;
  const convert = await converterTo(currency);

  const [items, sections] = await Promise.all([
    prisma.item.findMany({
      where: { wardrobeId },
      select: {
        id: true, name: true, brand: true, status: true, price: true, currency: true,
        targetPrice: true, sectionId: true, hue: true, createdAt: true,
        prices: { orderBy: { checkedAt: "asc" }, select: { price: true } },
      },
    }),
    prisma.section.findMany({ where: { wardrobeId }, orderBy: { order: "asc" }, select: { id: true, name: true } }),
  ]);

  let unconverted = 0;
  const value = (amount: number | null, cur: string | null) => {
    if (amount == null) return 0;
    const v = convert(amount, cur);
    if (v == null) {
      unconverted++;
      return 0;
    }
    return v;
  };

  const stats: WardrobeStats = {
    currency,
    owned: { count: 0, value: 0 },
    want: { count: 0, value: 0, targetGap: 0 },
    bySection: [],
    byBrand: [],
    hues: [],
    recent: [],
    drops: [],
    unconverted: 0,
  };

  const sectionMap = new Map<string, StatsBucket>(
    sections.map((s) => [s.id, { key: s.id, label: s.name, count: 0, value: 0 }])
  );
  const unsorted: StatsBucket = { key: "unsorted", label: "unsorted", count: 0, value: 0 };
  const brands = new Map<string, StatsBucket>();

  for (const it of items) {
    const v = value(it.price, it.currency);
    if (it.status === "owned") {
      stats.owned.count++;
      stats.owned.value += v;
    } else {
      stats.want.count++;
      stats.want.value += v;
      if (it.targetPrice != null && it.price != null && it.price > it.targetPrice) {
        stats.want.targetGap += value(it.price - it.targetPrice, it.currency);
      }
    }
    const sec = (it.sectionId && sectionMap.get(it.sectionId)) || unsorted;
    sec.count++;
    if (it.status === "owned") sec.value += v;

    const brand = it.brand?.trim().toLowerCase();
    if (brand) {
      const b = brands.get(brand) ?? { key: brand, label: brand, count: 0, value: 0 };
      b.count++;
      if (it.status === "owned") b.value += v;
      brands.set(brand, b);
    }
    if (it.hue >= 0) stats.hues.push(it.hue);

    const first = it.prices[0]?.price;
    if (it.status === "want" && first != null && it.price != null && it.price < first) {
      stats.drops.push({ id: it.id, name: it.name, from: first, to: it.price, currency: it.currency });
    }
  }

  stats.bySection = [...sectionMap.values(), ...(unsorted.count ? [unsorted] : [])];
  stats.byBrand = [...brands.values()].sort((a, b) => b.count - a.count || b.value - a.value).slice(0, 8);
  stats.recent = [...items]
    .sort((a, b) => +b.createdAt - +a.createdAt)
    .slice(0, 5)
    .map((i) => ({ id: i.id, name: i.name, createdAt: i.createdAt.toISOString() }));
  stats.drops = stats.drops.sort((a, b) => b.from - b.to - (a.from - a.to)).slice(0, 5);
  stats.hues.sort((a, b) => a - b);
  stats.unconverted = unconverted;
  return json(stats);
}

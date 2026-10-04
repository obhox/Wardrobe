import "server-only";
import { prisma } from "@/lib/db";
import type { Item } from "@prisma/client";
import { formatMoney } from "@/lib/currency";
import { mailerConfigured, sendMail } from "@/lib/auth/mailer";
import { brand } from "@/lib/brand";
import { scrapeProduct } from "./scrape";
import { convertAmount, normalizeCurrency, roundMoney } from "./fx";

// Price tracking for "want" items that have a product link.
//
// A check re-reads the product page, records a snapshot when the price moved
// (or once a day as a heartbeat), keeps the lowest price seen, and raises a
// notification on a real drop or when the target price is reached.
//
// Currency: every item has one tracking currency (its own `currency`) and all
// comparisons, the lowest price and the target happen in it. Shops switch
// currency by country or session, so an observed price in another currency is
// converted into the item's before anything is compared — a shop flipping
// $92 to ₦138,000 is not a price rise. When a price can't be converted (no
// code on the page, or the rates feed is down) the check records nothing but
// the time, rather than storing a number that means something else.

const DROP_THRESHOLD = 0.01; // ignore sub-1% wobble (rounding, FX noise on the shop's side)
const HEARTBEAT_MS = 24 * 60 * 60 * 1000;

export interface CheckOutcome {
  itemId: string;
  price: number | null;
  previous: number | null;
  notified: boolean;
  /** a price was found but couldn't be expressed in the item's currency */
  unconvertible?: boolean;
  /** the shop quoted another currency and we converted it */
  converted?: { price: number; currency: string } | null;
}

/** `read` is injectable so price logic can be exercised without a live shop. */
export async function checkItemPrice(
  item: Item,
  { read = scrapeProduct }: { read?: typeof scrapeProduct } = {}
): Promise<CheckOutcome> {
  const now = new Date();
  const previous = item.price;
  const touch = () => prisma.item.update({ where: { id: item.id }, data: { lastCheckedAt: now } });
  if (!item.sourceUrl) return { itemId: item.id, price: null, previous, notified: false };

  const res = await read(item.sourceUrl, { fresh: true });
  if (res.price == null) {
    await touch();
    return { itemId: item.id, price: null, previous, notified: false };
  }

  const seen = normalizeCurrency(res.currency);
  // the item's own currency is the tracking currency; adopt the shop's only
  // when the item has none yet
  const tracking = normalizeCurrency(item.currency) ?? seen;
  let price = roundMoney(res.price, tracking);
  let converted: CheckOutcome["converted"] = null;

  if (tracking && seen && seen !== tracking) {
    const inTracking = await convertAmount(res.price, seen, tracking);
    if (inTracking == null) {
      // can't compare apples with apples — don't write a misleading number
      await touch();
      return { itemId: item.id, price: null, previous, notified: false, unconvertible: true };
    }
    price = inTracking;
    converted = { price: res.price, currency: seen };
  }

  const last = await prisma.priceSnapshot.findFirst({
    where: { itemId: item.id },
    orderBy: { checkedAt: "desc" },
  });
  if (!last || last.price !== price || now.getTime() - last.checkedAt.getTime() > HEARTBEAT_MS) {
    await prisma.priceSnapshot.create({
      data: {
        itemId: item.id,
        price,
        currency: tracking,
        // keep what the page actually said, for transparency
        sourcePrice: converted ? converted.price : null,
        sourceCurrency: converted ? converted.currency : null,
      },
    });
  }

  await prisma.item.update({
    where: { id: item.id },
    data: {
      price,
      ...(item.currency ? {} : { currency: tracking }),
      lastCheckedAt: now,
      lowestPrice: item.lowestPrice == null ? price : Math.min(item.lowestPrice, price),
    },
  });

  let notified = false;
  if (item.priceAlert && item.status === "want") {
    const hitTarget =
      item.targetPrice != null && price <= item.targetPrice && (previous == null || previous > item.targetPrice);
    const dropped = previous != null && price < previous * (1 - DROP_THRESHOLD);
    if (hitTarget || dropped) {
      const owner = await prisma.wardrobe.findUnique({ where: { id: item.wardrobeId }, select: { ownerId: true } });
      if (owner) {
        const now$ = formatMoney(price, tracking) ?? String(price);
        const was$ = previous != null ? formatMoney(previous, tracking) : null;
        await prisma.notification.create({
          data: {
            userId: owner.ownerId,
            itemId: item.id,
            kind: hitTarget ? "target_hit" : "price_drop",
            body: hitTarget
              ? `${item.name} hit your target price, now ${now$}`
              : `${item.name} dropped to ${now$}${was$ ? ` (was ${was$})` : ""}`,
          },
        });
        notified = true;
      }
    }
  }
  return { itemId: item.id, price, previous, notified, converted };
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// Scheduled checks revisit an item only once this long has passed since it
// was last checked (or added — the price was read when it was saved).
const RECHECK_AFTER_MS = 24 * 60 * 60 * 1000;

/** Check the stalest tracked items (at most once a day each). One request per shop at a time. */
export async function runPriceChecks({
  limit = 40,
  staleAfterMs = RECHECK_AFTER_MS,
  budgetMs = 50_000,
  read,
}: { limit?: number; staleAfterMs?: number; budgetMs?: number; read?: typeof scrapeProduct } = {}) {
  const started = Date.now();
  const cutoff = new Date(Date.now() - staleAfterMs);
  const items = await prisma.item.findMany({
    where: {
      status: "want",
      sourceUrl: { not: null },
      OR: [{ lastCheckedAt: null, createdAt: { lt: cutoff } }, { lastCheckedAt: { lt: cutoff } }],
    },
    orderBy: [{ lastCheckedAt: { sort: "asc", nulls: "first" } }],
    take: limit,
  });

  const byHost = new Map<string, Item[]>();
  for (const it of items) {
    let host = "?";
    try {
      host = new URL(it.sourceUrl!).hostname;
    } catch {}
    byHost.set(host, [...(byHost.get(host) ?? []), it]);
  }

  const outcomes: CheckOutcome[] = [];
  const queues = [...byHost.values()];
  const workers = Array.from({ length: Math.min(4, queues.length) }, async () => {
    for (;;) {
      const queue = queues.shift();
      if (!queue) return;
      for (const it of queue) {
        if (Date.now() - started > budgetMs) return;
        try {
          outcomes.push(await checkItemPrice(it, read ? { read } : {}));
        } catch (e) {
          console.error("[prices] check failed", it.id, e instanceof Error ? e.message : e);
          await prisma.item.update({ where: { id: it.id }, data: { lastCheckedAt: new Date() } }).catch(() => {});
        }
        await sleep(1500);
      }
    }
  });
  await Promise.all(workers);

  const emailed = await sendDigests();
  return {
    checked: outcomes.length,
    priced: outcomes.filter((o) => o.price != null).length,
    unconvertible: outcomes.filter((o) => o.unconvertible).length,
    notified: outcomes.filter((o) => o.notified).length,
    emailed,
  };
}

// item names are stored as typed, often lowercase; a line of mail opens with a capital
const capFirst = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

// One email per person per day at most, bundling their unsent notices.
async function sendDigests(): Promise<number> {
  if (!mailerConfigured) return 0;
  const pending = await prisma.notification.findMany({
    where: { emailedAt: null, readAt: null, createdAt: { gt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000) } },
    include: { user: { select: { id: true, recoveryEmail: true, handle: true } } },
    orderBy: { createdAt: "asc" },
  });
  const byUser = new Map<string, typeof pending>();
  for (const n of pending) {
    if (!n.user.recoveryEmail) continue;
    byUser.set(n.userId, [...(byUser.get(n.userId) ?? []), n]);
  }

  let sent = 0;
  for (const [userId, notes] of byUser) {
    const recent = await prisma.notification.findFirst({
      where: { userId, emailedAt: { gt: new Date(Date.now() - 20 * 60 * 60 * 1000) } },
      select: { id: true },
    });
    if (recent) continue;
    const to = notes[0].user.recoveryEmail!;
    const lines = notes.map((n) => `- ${capFirst(n.body)}`).join("\n");
    try {
      await sendMail({
        to,
        subject: notes.length === 1 ? capFirst(notes[0].body) : `${notes.length} price drops on your wishlist`,
        text: `${lines}\n\nOpen your wardrobe to take a look.\n\nYou can turn alerts off for an item from its details.\n\n${brand.wordmark}`,
      });
      await prisma.notification.updateMany({
        where: { id: { in: notes.map((n) => n.id) } },
        data: { emailedAt: new Date() },
      });
      sent++;
    } catch (e) {
      console.error("[prices] digest mail failed", e instanceof Error ? e.message : e);
    }
  }
  return sent;
}

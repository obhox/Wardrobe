import "server-only";
import { prisma } from "@/lib/db";
import type { Item } from "@prisma/client";
import { formatMoney } from "@/lib/currency";
import { mailerConfigured, sendMail } from "@/lib/auth/mailer";
import { scrapeProduct } from "./scrape";

// Price tracking for "want" items that have a product link.
//
// A check re-reads the product page, records a snapshot when the price moved
// (or once a day as a heartbeat), keeps the lowest price seen, and raises a
// notification on a real drop or when the target price is reached.

const DROP_THRESHOLD = 0.01; // ignore sub-1% wobble (rounding, FX noise on the shop's side)
const HEARTBEAT_MS = 24 * 60 * 60 * 1000;

export interface CheckOutcome {
  itemId: string;
  price: number | null;
  previous: number | null;
  notified: boolean;
}

export async function checkItemPrice(item: Item): Promise<CheckOutcome> {
  const now = new Date();
  if (!item.sourceUrl) return { itemId: item.id, price: null, previous: item.price, notified: false };

  const res = await scrapeProduct(item.sourceUrl, { fresh: true });
  const price = res.price ?? null;
  const previous = item.price;

  if (price == null) {
    await prisma.item.update({ where: { id: item.id }, data: { lastCheckedAt: now } });
    return { itemId: item.id, price: null, previous, notified: false };
  }

  const currency = res.currency ?? item.currency;
  const last = await prisma.priceSnapshot.findFirst({
    where: { itemId: item.id },
    orderBy: { checkedAt: "desc" },
  });
  if (!last || last.price !== price || now.getTime() - last.checkedAt.getTime() > HEARTBEAT_MS) {
    await prisma.priceSnapshot.create({ data: { itemId: item.id, price, currency } });
  }

  await prisma.item.update({
    where: { id: item.id },
    data: {
      price,
      currency: currency ?? undefined,
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
        const now$ = formatMoney(price, currency) ?? String(price);
        const was$ = previous != null ? formatMoney(previous, currency) : null;
        await prisma.notification.create({
          data: {
            userId: owner.ownerId,
            itemId: item.id,
            kind: hitTarget ? "target_hit" : "price_drop",
            body: hitTarget
              ? `${item.name} hit your target — now ${now$}`
              : `${item.name} dropped to ${now$}${was$ ? ` (was ${was$})` : ""}`,
          },
        });
        notified = true;
      }
    }
  }
  return { itemId: item.id, price, previous, notified };
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// Scheduled checks revisit an item only once this long has passed since it
// was last checked (or added — the price was read when it was saved).
const RECHECK_AFTER_MS = 30 * 24 * 60 * 60 * 1000;

/** Check the stalest tracked items. One request at a time per shop. */
export async function runPriceChecks({
  limit = 40,
  staleAfterMs = RECHECK_AFTER_MS,
  budgetMs = 50_000,
}: { limit?: number; staleAfterMs?: number; budgetMs?: number } = {}) {
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
          outcomes.push(await checkItemPrice(it));
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
    notified: outcomes.filter((o) => o.notified).length,
    emailed,
  };
}

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
    const lines = notes.map((n) => `✦ ${n.body}`).join("\n");
    try {
      await sendMail({
        to,
        subject: notes.length === 1 ? `✦ ${notes[0].body}` : `✦ ${notes.length} price drops on your wishlist`,
        text: `${lines}\n\nopen your wardrobe to take a look.\n\nturn alerts off for an item from its detail card.\n\n✦ wardrobe`,
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

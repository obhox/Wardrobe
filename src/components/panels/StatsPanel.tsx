"use client";
import { useEffect, useState } from "react";
import { useStore } from "@/lib/store";
import { api } from "@/lib/api";
import { formatMoney } from "@/lib/currency";
import type { StatsBucket, WardrobeStats } from "@/lib/types";
import Dialog from "@/components/ui/Dialog";
import { Card, Skeleton } from "@/components/ui/Card";
import { FormField } from "@/components/ui/Field";

// Closet value and wishlist at a glance, for the open wardrobe. Every price is
// converted into one display currency (set in account).
export default function StatsPanel({ defaultCurrency }: { defaultCurrency: string }) {
  const setPanel = useStore((s) => s.setPanel);
  const select = useStore((s) => s.select);
  const wardrobe = useStore((s) => s.payload?.wardrobe);
  const itemCount = useStore((s) => s.payload?.items.length ?? 0);
  const [stats, setStats] = useState<WardrobeStats | null>(null);
  const [err, setErr] = useState("");

  useEffect(() => {
    if (!wardrobe) return;
    let live = true;
    api
      .get(`/api/stats?w=${wardrobe.id}&currency=${defaultCurrency}`)
      .then((s) => live && setStats(s))
      .catch((e) => live && setErr((e as Error).message));
    return () => {
      live = false;
    };
  }, [wardrobe, defaultCurrency, itemCount]);

  const close = () => setPanel(null);
  const money = (v: number) => formatMoney(Math.round(v), stats?.currency) ?? "—";

  return (
    <Dialog title="Stats" variant="sheet" onClose={close}>
      <p className="text-caption text-ink-soft">
        <span className="cap-first inline-block">{wardrobe?.title}</span> · totals in {stats?.currency ?? defaultCurrency}
      </p>

      {err && (
        <p className="mt-4 text-caption text-danger" role="alert">
          {err}
        </p>
      )}
      {!stats && !err && <Skeleton className="mt-6 h-40 rounded-card" />}

      {stats && (
        <>
          <div className="mt-5 grid grid-cols-2 gap-3">
            <Figure label="Owned" value={money(stats.owned.value)} sub={`${stats.owned.count} ${stats.owned.count === 1 ? "item" : "items"}`} />
            <Figure label="Want" value={money(stats.want.value)} sub={`${stats.want.count} on the list`} />
          </div>
          {stats.want.targetGap > 0 && (
            <p className="mt-3 text-caption text-ink-soft">
              Your wishlist is {money(stats.want.targetGap)} above your target prices.
            </p>
          )}
          {stats.unconverted > 0 && (
            <p className="mt-1 text-caption text-ink-soft">
              {stats.unconverted} price{stats.unconverted === 1 ? "" : "s"} couldn&apos;t be converted and {stats.unconverted === 1 ? "is" : "are"} left out.
            </p>
          )}

          {stats.hues.length > 0 && (
            <FormField label="Colour spectrum" className="mt-6">
              <div className="flex h-5 overflow-hidden rounded-full border border-rule" role="img" aria-label={`${stats.hues.length} items by colour`}>
                {stats.hues.map((h, i) => (
                  <span key={i} className="flex-1" style={{ background: `hsl(${h} 62% 62%)` }} />
                ))}
              </div>
            </FormField>
          )}

          <Bars label="By section" rows={stats.bySection} money={money} />
          {stats.byBrand.length > 0 && <Bars label="Top brands" rows={stats.byBrand} money={money} />}

          {stats.drops.length > 0 && (
            <FormField label="Biggest price drops" className="mt-6">
              <ul>
                {stats.drops.map((d) => (
                  <li key={d.id}>
                    <button onClick={() => select(d.id)} className="flex w-full items-baseline justify-between gap-3 py-1.5 text-left text-caption hover:underline">
                      <span className="cap-first min-w-0 truncate">{d.name}</span>
                      <span className="price shrink-0 text-ink-soft">
                        {formatMoney(d.from, d.currency)} → {formatMoney(d.to, d.currency)}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </FormField>
          )}

          {stats.recent.length > 0 && (
            <FormField label="Recently added" className="mt-6">
              <ul>
                {stats.recent.map((r) => (
                  <li key={r.id}>
                    <button onClick={() => select(r.id)} className="flex w-full items-baseline justify-between gap-3 py-1.5 text-left text-caption hover:underline">
                      <span className="cap-first min-w-0 truncate">{r.name}</span>
                      <span className="shrink-0 text-ink-soft">
                        {new Date(r.createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </FormField>
          )}
        </>
      )}
    </Dialog>
  );
}

function Figure({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <Card className="p-3.5">
      <div className="label-caps text-ink-soft">{label}</div>
      <div className="tabular mt-1.5 truncate font-display text-heading">{value}</div>
      <div className="text-caption text-ink-soft">{sub}</div>
    </Card>
  );
}

// one series, so one colour (ink); the label and numbers sit above each bar,
// where a long name has the full width instead of being cut short
function Bars({ label, rows, money }: { label: string; rows: StatsBucket[]; money: (v: number) => string }) {
  const max = Math.max(1, ...rows.map((r) => r.count));
  if (!rows.length) return null;
  return (
    <FormField label={label} className="mt-6">
      <ul className="space-y-2.5">
        {rows.map((r) => (
          <li key={r.key}>
            <div className="flex items-baseline justify-between gap-3 text-caption">
              <span className="cap-first min-w-0 break-words">{r.label}</span>
              <span className="tabular shrink-0 text-ink-soft">
                {r.count}
                {r.value ? ` · ${money(r.value)}` : ""}
              </span>
            </div>
            <div className="mt-1 h-1.5 rounded-full bg-ink/8">
              <div className="h-full rounded-full bg-ink" style={{ width: `${(r.count / max) * 100}%`, minWidth: r.count ? 4 : 0 }} />
            </div>
          </li>
        ))}
      </ul>
    </FormField>
  );
}

"use client";
import { useEffect, useState } from "react";
import { useStore } from "@/lib/store";
import { api } from "@/lib/api";
import { formatMoney } from "@/lib/currency";
import type { StatsBucket, WardrobeStats } from "@/lib/types";
import Dialog, { SheetHeader } from "@/components/ui/Dialog";
import { Group } from "@/components/ui/controls";

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
    <Dialog title="stats" variant="sheet" onClose={close} labelledBy="stats-title">
      <SheetHeader id="stats-title" title="stats" onClose={close} />
      <p className="mt-1 text-[11px] lowercase text-ink-soft">
        {wardrobe?.title} · totals in {stats?.currency.toLowerCase() ?? defaultCurrency.toLowerCase()}
      </p>

      {err && <p className="mt-4 text-xs lowercase text-blush" role="alert">{err}</p>}
      {!stats && !err && <div className="shimmer mt-6 h-40 rounded-xl" aria-label="loading" />}

      {stats && (
        <>
          <div className="mt-5 grid grid-cols-2 gap-2">
            <Tile label="owned" value={money(stats.owned.value)} sub={`${stats.owned.count} ${stats.owned.count === 1 ? "thing" : "things"}`} />
            <Tile label="want" value={money(stats.want.value)} sub={`${stats.want.count} on the list`} />
          </div>
          {stats.want.targetGap > 0 && (
            <p className="mt-2 text-[11px] lowercase text-ink-soft">
              {money(stats.want.targetGap)} above your target prices — waiting pays.
            </p>
          )}
          {stats.unconverted > 0 && (
            <p className="mt-1 text-[11px] lowercase text-ink-soft">
              {stats.unconverted} price{stats.unconverted === 1 ? "" : "s"} couldn&apos;t be converted and {stats.unconverted === 1 ? "is" : "are"} left out.
            </p>
          )}

          {stats.hues.length > 0 && (
            <Group label="colour spectrum">
              <div className="flex h-5 overflow-hidden rounded-full border border-rule" role="img" aria-label={`${stats.hues.length} items by colour`}>
                {stats.hues.map((h, i) => (
                  <span key={i} className="flex-1" style={{ background: `hsl(${h} 62% 62%)` }} title={`hue ${h}°`} />
                ))}
              </div>
            </Group>
          )}

          <Bars label="by section — count (owned value)" rows={stats.bySection} money={money} />
          {stats.byBrand.length > 0 && <Bars label="top brands" rows={stats.byBrand} money={money} />}

          {stats.drops.length > 0 && (
            <Group label="biggest price drops">
              <ul className="space-y-1">
                {stats.drops.map((d) => (
                  <li key={d.id}>
                    <button onClick={() => select(d.id)} className="flex w-full justify-between gap-2 text-left text-xs lowercase hover:underline">
                      <span className="truncate">{d.name}</span>
                      <span className="tabular shrink-0 text-ink-soft">
                        {formatMoney(d.from, d.currency)} → {formatMoney(d.to, d.currency)}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </Group>
          )}

          {stats.recent.length > 0 && (
            <Group label="recently added">
              <ul className="space-y-1">
                {stats.recent.map((r) => (
                  <li key={r.id}>
                    <button onClick={() => select(r.id)} className="flex w-full justify-between gap-2 text-left text-xs lowercase hover:underline">
                      <span className="truncate">{r.name}</span>
                      <span className="shrink-0 text-ink-soft">
                        {new Date(r.createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </Group>
          )}
        </>
      )}
    </Dialog>
  );
}

function Tile({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="rounded-xl border border-rule bg-ground/25 p-3">
      <div className="text-[11px] lowercase text-ink-soft">{label}</div>
      <div className="tabular mt-1 truncate font-[family-name:var(--font-display)] text-lg">{value}</div>
      <div className="text-[11px] lowercase text-ink-soft">{sub}</div>
    </div>
  );
}

// one series, so one colour (ink); the numbers are always printed too
function Bars({ label, rows, money }: { label: string; rows: StatsBucket[]; money: (v: number) => string }) {
  const max = Math.max(1, ...rows.map((r) => r.count));
  if (!rows.length) return null;
  return (
    <Group label={label}>
      <ul className="space-y-1.5">
        {rows.map((r) => (
          <li key={r.key} className="grid grid-cols-[6.5rem_1fr_auto] items-center gap-2 text-xs lowercase" title={`${r.label}: ${r.count}${r.value ? ` · ${money(r.value)}` : ""}`}>
            <span className="truncate">{r.label}</span>
            <span className="h-2.5 rounded-full bg-ink/10">
              <span className="block h-full rounded-full bg-ink" style={{ width: `${(r.count / max) * 100}%`, minWidth: r.count ? 4 : 0 }} />
            </span>
            <span className="tabular text-ink-soft">
              {r.count}
              {r.value ? ` · ${money(r.value)}` : ""}
            </span>
          </li>
        ))}
      </ul>
    </Group>
  );
}

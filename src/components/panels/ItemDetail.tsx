"use client";
import { useEffect, useState } from "react";
import { useStore } from "@/lib/store";
import { api } from "@/lib/api";
import { SIZE_TIERS } from "@/lib/theme";
import { formatMoney } from "@/lib/currency";
import { downscaleImage, imageBlob, proxiedSrc, uploadImage } from "@/lib/img";
import { extractHue } from "@/lib/color";
import { cutOut, cutoutLooksGood } from "@/lib/cutout";
import { useDebounced } from "@/lib/hooks";
import type { Item, ItemStatus, PricePoint, SizeTier } from "@/lib/types";
import Dialog from "@/components/ui/Dialog";
import { Pill, Toggle, fieldClass } from "@/components/ui/controls";
import PriceField, { Chevron } from "./PriceField";
import Priority from "./Priority";
import Sparkline from "./Sparkline";

type Draft = Pick<Item, "name" | "brand" | "boughtAt" | "notes" | "sourceUrl">;

export default function ItemDetail() {
  const select = useStore((s) => s.select);
  const item = useStore((s) => s.payload?.items.find((i) => i.id === s.selectedId));
  const items = useStore((s) => s.payload?.items);
  const sections = useStore((s) => s.payload?.sections);
  const wardrobes = useStore((s) => s.payload?.wardrobes);
  const wardrobeId = useStore((s) => s.payload?.wardrobe.id);
  const updateItem = useStore((s) => s.updateItem);
  const replaceItem = useStore((s) => s.replaceItem);
  const deleteItem = useStore((s) => s.deleteItem);
  const moveItemToWardrobe = useStore((s) => s.moveItemToWardrobe);
  const toast = useStore((s) => s.toast);

  // text fields edit a local draft; the server hears about it once typing pauses
  const [draft, setDraft] = useState<Draft | null>(null);
  const [draftFor, setDraftFor] = useState<string | null>(null);
  const [busy, setBusy] = useState<"" | "cut" | "photo" | "check">("");
  const [history, setHistory] = useState<PricePoint[] | null>(null);

  if (item && draftFor !== item.id) {
    setDraftFor(item.id);
    setDraft({ name: item.name, brand: item.brand, boughtAt: item.boughtAt, notes: item.notes, sourceUrl: item.sourceUrl });
    setHistory(null);
  }

  const save = useDebounced((id: string, patch: Partial<Item>) => updateItem(id, patch), 600);

  const tracked = !!item?.sourceUrl && item.status === "want";
  useEffect(() => {
    if (!item || !tracked) return;
    let live = true;
    api
      .get(`/api/items/${item.id}/prices`)
      .then((r) => live && setHistory(r.points))
      .catch(() => live && setHistory([]));
    return () => {
      live = false;
    };
  }, [item?.id, tracked, item?.lastCheckedAt]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!item || !draft) return null;

  function edit<K extends keyof Draft>(key: K, value: Draft[K]) {
    setDraft((d) => (d ? { ...d, [key]: value } : d));
    if (key === "name" && !String(value ?? "").trim()) return; // never save an empty name
    save(item!.id, { [key]: typeof value === "string" ? value : value ?? null });
  }

  // prev / next through the current wardrobe
  const idx = items?.findIndex((i) => i.id === item.id) ?? -1;
  const step = (d: number) => {
    if (!items?.length) return;
    select(items[(idx + d + items.length) % items.length].id);
  };

  async function recut() {
    setBusy("cut");
    try {
      const blob = await imageBlob(item!.imageUrl);
      const out = await cutOut(blob);
      if (!(await cutoutLooksGood(out))) toast("that cutout came out rough — kept it anyway, use the original if you prefer");
      const url = await uploadImage(out, "cutout");
      const hue = await extractHue(URL.createObjectURL(out)).catch(() => item!.hue);
      await updateItem(item!.id, { cutoutUrl: url, hue });
    } catch (e) {
      toast(`couldn't cut that out — ${(e as Error).message}`, { tone: "error" });
    }
    setBusy("");
  }

  async function replacePhoto(file: File | undefined) {
    if (!file) return;
    setBusy("photo");
    try {
      const url = await uploadImage(await downscaleImage(file), "original");
      await updateItem(item!.id, { imageUrl: url, cutoutUrl: null });
      toast("photo replaced — cut it out when you like");
    } catch (e) {
      toast((e as Error).message, { tone: "error" });
    }
    setBusy("");
  }

  async function checkNow() {
    setBusy("check");
    try {
      const r = await api.post(`/api/items/${item!.id}/check`);
      replaceItem(r.item);
      toast(r.found ? `now ${formatMoney(r.item.price, r.item.currency)}` : "couldn't find a price on that page");
    } catch (e) {
      toast((e as Error).message, { tone: "error" });
    }
    setBusy("");
  }

  const money = (v?: number | null) => formatMoney(v, item.currency);
  const atTarget = item.targetPrice != null && item.price != null && item.price <= item.targetPrice;

  return (
    <Dialog title={item.name} onClose={() => select(null)} className="max-w-2xl">
      <div
        className="grid grid-cols-1 gap-5 sm:grid-cols-[220px_1fr]"
        onKeyDown={(e) => {
          const t = e.target as HTMLElement;
          if (/input|textarea|select/i.test(t.tagName)) return;
          if (e.key === "ArrowRight") step(1);
          if (e.key === "ArrowLeft") step(-1);
        }}
      >
        <div className="flex flex-col gap-2">
          <div className={"flex items-center justify-center rounded-xl p-4 " + (item.cutoutUrl ? "checker" : "bg-ground/30")}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={proxiedSrc(item.cutoutUrl || item.imageUrl)}
              alt={item.name}
              className={"max-h-52 max-w-full object-contain cutout-shadow " + (busy === "cut" ? "opacity-50" : "")}
            />
          </div>
          <div className="flex flex-wrap justify-center gap-x-3 gap-y-1 text-[11px] lowercase text-ink-soft">
            <button disabled={!!busy} onClick={recut} className="underline underline-offset-4 hover:text-ink disabled:opacity-40">
              {busy === "cut" ? "cutting…" : item.cutoutUrl ? "re-cut" : "cut out background"}
            </button>
            {item.cutoutUrl && (
              <button
                disabled={!!busy}
                onClick={() => updateItem(item.id, { cutoutUrl: null })}
                className="underline underline-offset-4 hover:text-ink disabled:opacity-40"
              >
                use original
              </button>
            )}
            <label className="cursor-pointer underline underline-offset-4 hover:text-ink">
              {busy === "photo" ? "uploading…" : "replace photo"}
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif,image/avif"
                className="sr-only"
                onChange={(e) => replacePhoto(e.target.files?.[0])}
              />
            </label>
          </div>
          {items && items.length > 1 && (
            <div className="flex justify-center gap-2 text-xs text-ink-soft">
              <button onClick={() => step(-1)} aria-label="previous item" className="rounded px-2 hover:text-ink">←</button>
              <span className="tabular">{idx + 1} / {items.length}</span>
              <button onClick={() => step(1)} aria-label="next item" className="rounded px-2 hover:text-ink">→</button>
            </div>
          )}
        </div>

        <div className="flex min-w-0 flex-col gap-3">
          <input
            aria-label="name"
            value={draft.name}
            maxLength={120}
            onChange={(e) => edit("name", e.target.value)}
            onBlur={() => !draft.name.trim() && setDraft({ ...draft, name: item.name })}
            className="w-full rounded bg-transparent font-[family-name:var(--font-display)] text-xl lowercase outline-none focus:bg-ground/30"
          />

          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <input
              aria-label="brand"
              value={draft.brand ?? ""}
              maxLength={80}
              onChange={(e) => edit("brand", e.target.value)}
              placeholder="brand"
              className={fieldClass}
            />
            <PriceField
              size="sm"
              currency={item.currency}
              onCurrency={(v) => updateItem(item.id, { currency: v || null })}
              amount={item.price != null ? String(item.price) : ""}
              onAmount={(v) => updateItem(item.id, { price: v ? Number(v) : null })}
              placeholder={item.status === "want" ? "current price" : "price paid"}
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {(["owned", "want"] as ItemStatus[]).map((st) => (
              <Pill key={st} on={item.status === st} onClick={() => updateItem(item.id, { status: st })}>
                {st}
              </Pill>
            ))}
            <div className="relative flex items-center">
              <label htmlFor="detail-section" className="sr-only">section</label>
              <select
                id="detail-section"
                value={item.sectionId ?? ""}
                onChange={(e) => updateItem(item.id, { sectionId: e.target.value || null })}
                className="cursor-pointer appearance-none rounded-full border border-rule bg-ground/40 py-1 pl-3 pr-7 text-base lowercase outline-none focus-visible:border-ink sm:text-xs"
              >
                <option value="">unsorted</option>
                {(sections ?? []).map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
              <Chevron />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs lowercase text-ink-soft">size</span>
            {SIZE_TIERS.map((t) => (
              <Pill key={t} on={item.sizeTier === t} onClick={() => updateItem(item.id, { sizeTier: t as SizeTier })}>
                {t}
              </Pill>
            ))}
          </div>

          {item.status === "owned" ? (
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_auto]">
              <input
                aria-label="where bought"
                value={draft.boughtAt ?? ""}
                maxLength={120}
                onChange={(e) => edit("boughtAt", e.target.value)}
                placeholder="where bought"
                className={fieldClass}
              />
              <input
                type="date"
                aria-label="purchase date"
                value={item.purchasedAt?.slice(0, 10) ?? ""}
                max={new Date().toISOString().slice(0, 10)}
                onChange={(e) => updateItem(item.id, { purchasedAt: e.target.value || null })}
                className={`${fieldClass} sm:w-40`}
              />
            </div>
          ) : (
            <div className="space-y-2 rounded-xl border border-rule bg-ground/20 p-3">
              <PriceField
                size="sm"
                currency={item.currency}
                lockCurrency
                amount={item.targetPrice != null ? String(item.targetPrice) : ""}
                onAmount={(v) => updateItem(item.id, { targetPrice: v ? Number(v) : null })}
                placeholder="target price"
              />
              <div className="flex items-center gap-2 text-xs lowercase text-ink-soft">
                priority <Priority value={item.priority} onChange={(v) => updateItem(item.id, { priority: v })} />
              </div>
              {item.sourceUrl ? (
                <>
                  {history && history.length > 1 && (
                    <Sparkline points={history.map((h) => h.price)} target={item.targetPrice ?? undefined} />
                  )}
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] lowercase text-ink-soft">
                    {atTarget && <span className="accent-pin rounded-full px-1.5">◎ at your target</span>}
                    {item.lowestPrice != null && <span>lowest seen {money(item.lowestPrice)}</span>}
                    <span>
                      {item.lastCheckedAt
                        ? `checked ${new Date(item.lastCheckedAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })}`
                        : "not checked yet"}
                    </span>
                    <button disabled={!!busy} onClick={checkNow} className="underline underline-offset-4 hover:text-ink disabled:opacity-40">
                      {busy === "check" ? "checking…" : "check now"}
                    </button>
                  </div>
                  <Toggle
                    on={item.priceAlert !== false}
                    onChange={(v) => updateItem(item.id, { priceAlert: v })}
                    label="tell me when the price drops"
                  />
                </>
              ) : (
                <p className="text-[11px] lowercase text-ink-soft">add the product link below to track its price.</p>
              )}
            </div>
          )}

          <textarea
            aria-label="notes"
            value={draft.notes ?? ""}
            maxLength={2000}
            onChange={(e) => edit("notes", e.target.value)}
            placeholder="notes…"
            rows={2}
            className={`${fieldClass} resize-none`}
          />

          <input
            aria-label="product link"
            value={draft.sourceUrl ?? ""}
            maxLength={4000}
            inputMode="url"
            onChange={(e) => {
              const v = e.target.value.trim();
              setDraft({ ...draft, sourceUrl: v });
              if (!v || /^https?:\/\/\S+\.\S+/.test(v)) save(item.id, { sourceUrl: v || null });
            }}
            placeholder="product link (optional)"
            className={`${fieldClass} normal-case`}
          />

          {wardrobes && wardrobes.length > 1 && (
            <div className="relative flex items-center">
              <label htmlFor="detail-move" className="sr-only">move to another wardrobe</label>
              <select
                id="detail-move"
                value=""
                onChange={(e) => e.target.value && moveItemToWardrobe(item.id, e.target.value)}
                className="w-full cursor-pointer appearance-none rounded-lg border border-rule bg-ground/40 py-1.5 pl-3 pr-8 text-base lowercase outline-none focus-visible:border-ink sm:text-xs"
              >
                <option value="">move to another wardrobe…</option>
                {wardrobes
                  .filter((w) => w.id !== wardrobeId)
                  .map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.icon ?? "✦"} {w.title}
                    </option>
                  ))}
              </select>
              <Chevron />
            </div>
          )}

          <div className="mt-1 flex items-center justify-between gap-2">
            {item.sourceUrl ? (
              <a
                href={item.sourceUrl}
                target="_blank"
                rel="noreferrer noopener"
                className="text-xs lowercase text-ink-soft underline underline-offset-4"
              >
                open link ↗
              </a>
            ) : (
              <span />
            )}
            <div className="flex gap-2">
              <button
                onClick={() => deleteItem(item.id)}
                className="rounded-lg border border-rule px-3 py-1.5 text-xs lowercase hover:text-blush"
              >
                remove
              </button>
              <button onClick={() => select(null)} className="rounded-lg bg-ink px-4 py-1.5 text-xs lowercase text-panel">
                done
              </button>
            </div>
          </div>
        </div>
      </div>
    </Dialog>
  );
}

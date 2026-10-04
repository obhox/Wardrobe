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
import { ArrowUpRight, ChevronLeft, ChevronRight } from "lucide-react";
import { cx } from "@/lib/cx";
import Dialog from "@/components/ui/Dialog";
import { Button, IconButton } from "@/components/ui/Button";
import { Chip } from "@/components/ui/Chip";
import { FormField, Input, Select, Textarea } from "@/components/ui/Field";
import { Segmented } from "@/components/ui/Segmented";
import { Switch } from "@/components/ui/Switch";
import PriceField from "./PriceField";
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
  const theme = useStore((s) => s.payload?.wardrobe.theme);
  const updateItem = useStore((s) => s.updateItem);
  const replaceItem = useStore((s) => s.replaceItem);
  const deleteItem = useStore((s) => s.deleteItem);
  const moveItemToWardrobe = useStore((s) => s.moveItemToWardrobe);
  const toast = useStore((s) => s.toast);

  // text fields edit a local draft; the server hears about it once typing pauses
  const [draft, setDraft] = useState<Draft | null>(null);
  const [draftFor, setDraftFor] = useState<string | null>(null);
  const [busy, setBusy] = useState<"" | "cut" | "photo" | "check">("");
  // a currency change with a price on the item asks first: convert, or relabel?
  const [pendingCurrency, setPendingCurrency] = useState<string | null>(null);
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
      if (!(await cutoutLooksGood(out))) toast("That cutout came out rough. We kept it; use the original if you prefer.");
      const url = await uploadImage(out, "cutout");
      const hue = await extractHue(URL.createObjectURL(out)).catch(() => item!.hue);
      await updateItem(item!.id, { cutoutUrl: url, hue });
    } catch (e) {
      toast(`Couldn't cut that out: ${(e as Error).message}`, { tone: "error" });
    }
    setBusy("");
  }

  async function replacePhoto(file: File | undefined) {
    if (!file) return;
    setBusy("photo");
    try {
      const url = await uploadImage(await downscaleImage(file), "original");
      await updateItem(item!.id, { imageUrl: url, cutoutUrl: null });
      toast("Photo replaced. Remove its background when you like.");
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
      toast(
        r.found
          ? `Now ${formatMoney(r.item.price, r.item.currency)}${
              r.converted ? ` (the page says ${formatMoney(r.converted.price, r.converted.currency)})` : ""
            }`
          : r.unconvertible
            ? "That page quotes a currency we can't convert right now. Try again later."
            : "Couldn't find a price on that page"
      );
    } catch (e) {
      toast((e as Error).message, { tone: "error" });
    }
    setBusy("");
  }

  function changeCurrency(next: string) {
    if (!next || next === item!.currency) return;
    const hasAmounts = item!.price != null || item!.targetPrice != null;
    // nothing to convert → just set it
    if (!hasAmounts || !item!.currency) {
      updateItem(item!.id, { currency: next || null });
      return;
    }
    setPendingCurrency(next);
  }

  async function applyCurrency(relabel: boolean) {
    const next = pendingCurrency;
    setPendingCurrency(null);
    if (!next) return;
    try {
      const saved = await api.patch(`/api/items/${item!.id}`, { currency: next, relabelCurrency: relabel });
      replaceItem(saved);
      const sw = saved.currencySwitch;
      if (sw && !relabel && !sw.converted) {
        toast("Couldn't get today's rates, so the numbers stayed and only the currency changed", { tone: "error" });
      } else if (sw?.converted) {
        toast(`Converted to ${sw.to} at today's rate`);
      }
    } catch (e) {
      toast((e as Error).message, { tone: "error" });
    }
  }

  const money = (v?: number | null) => formatMoney(v, item.currency);
  const atTarget = item.targetPrice != null && item.price != null && item.price <= item.targetPrice;

  const pager = items && items.length > 1 && (
    <div className="flex items-center gap-1">
      <IconButton label="Previous item" size="sm" onClick={() => step(-1)}>
        <ChevronLeft aria-hidden className="h-4 w-4" />
      </IconButton>
      <span className="label-caps tabular px-1 text-ink-soft">
        {idx + 1} / {items.length}
      </span>
      <IconButton label="Next item" size="sm" onClick={() => step(1)}>
        <ChevronRight aria-hidden className="h-4 w-4" />
      </IconButton>
    </div>
  );

  const link = "underline underline-offset-4 hover:text-ink disabled:opacity-40";

  return (
    <Dialog title={item.name} heading={pager || undefined} onClose={() => select(null)} className="sm:max-w-2xl">
      <div
        className="grid grid-cols-1 gap-6 sm:grid-cols-[15rem_1fr]"
        onKeyDown={(e) => {
          const t = e.target as HTMLElement;
          if (/input|textarea|select/i.test(t.tagName)) return;
          if (e.key === "ArrowRight") step(1);
          if (e.key === "ArrowLeft") step(-1);
        }}
      >
        <div className="mx-auto flex w-full max-w-[15rem] flex-col gap-2">
          {/* the item on its wardrobe's own ground */}
          <div
            data-theme={theme}
            className="ground-field flex aspect-[4/5] items-center justify-center overflow-hidden rounded-card"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={proxiedSrc(item.cutoutUrl || item.imageUrl)}
              alt={item.name}
              className={cx(
                item.cutoutUrl ? "cutout-shadow max-h-[84%] max-w-[84%] object-contain" : "h-full w-full object-cover",
                busy === "cut" && "opacity-50"
              )}
            />
          </div>
          <div className="flex flex-wrap justify-center gap-x-3 gap-y-1 text-caption text-ink-soft">
            <button disabled={!!busy} onClick={recut} className={link}>
              {busy === "cut" ? "Cutting…" : item.cutoutUrl ? "Re-cut" : "Remove background"}
            </button>
            {item.cutoutUrl && (
              <button disabled={!!busy} onClick={() => updateItem(item.id, { cutoutUrl: null })} className={link}>
                Use original
              </button>
            )}
            <label className={cx(link, "cursor-pointer")}>
              {busy === "photo" ? "Uploading…" : "Replace photo"}
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif,image/avif"
                className="sr-only"
                onChange={(e) => replacePhoto(e.target.files?.[0])}
              />
            </label>
          </div>
        </div>

        <div className="flex min-w-0 flex-col gap-4">
          <input
            aria-label="Name"
            value={draft.name}
            maxLength={120}
            onChange={(e) => edit("name", e.target.value)}
            onBlur={() => !draft.name.trim() && setDraft({ ...draft, name: item.name })}
            className="-mx-1.5 w-[calc(100%+0.75rem)] rounded-md bg-transparent px-1.5 py-0.5 font-display text-heading hover:bg-wash focus:bg-wash"
          />

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <FormField label="Brand" htmlFor="detail-brand">
              <Input id="detail-brand" value={draft.brand ?? ""} maxLength={80} onChange={(e) => edit("brand", e.target.value)} />
            </FormField>
            <FormField label={item.status === "want" ? "Current price" : "Price paid"} htmlFor="detail-price">
              <PriceField
                id="detail-price"
                label={item.status === "want" ? "Current price" : "Price paid"}
                currency={item.currency}
                onCurrency={(v) => changeCurrency(v)}
                amount={item.price != null ? String(item.price) : ""}
                onAmount={(v) => updateItem(item.id, { price: v ? Number(v) : null })}
              />
            </FormField>
          </div>

          {pendingCurrency && (
            <div className="rounded-card border border-rule bg-wash p-3 text-caption" role="group" aria-label="Currency change">
              <p>
                Is {money(item.price ?? item.targetPrice)} already the price in {pendingCurrency}, or should it be converted?
              </p>
              <div className="mt-2.5 flex flex-wrap gap-2">
                <Button size="sm" variant="primary" onClick={() => applyCurrency(false)}>
                  Convert to {pendingCurrency}
                </Button>
                <Button size="sm" onClick={() => applyCurrency(true)}>
                  It&apos;s already {pendingCurrency}
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setPendingCurrency(null)}>
                  Cancel
                </Button>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <FormField label="Status">
              <Segmented
                label="Status"
                value={item.status}
                onChange={(st: ItemStatus) => updateItem(item.id, { status: st })}
                options={[
                  { value: "owned", label: "Owned" },
                  { value: "want", label: "Want" },
                ]}
                className="flex w-full"
              />
            </FormField>
            <FormField label="Section" htmlFor="detail-section">
              <Select id="detail-section" value={item.sectionId ?? ""} onChange={(e) => updateItem(item.id, { sectionId: e.target.value || null })}>
                <option value="">Unsorted</option>
                {(sections ?? []).map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </Select>
            </FormField>
          </div>

          <FormField label="Size in the collage">
            <div className="flex flex-wrap gap-1.5" role="group" aria-label="Size in the collage">
              {SIZE_TIERS.map((t) => (
                <Chip key={t} on={item.sizeTier === t} onClick={() => updateItem(item.id, { sizeTier: t as SizeTier })} className="capitalize">
                  {t}
                </Chip>
              ))}
            </div>
          </FormField>

          {item.status === "owned" ? (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_11rem]">
              <FormField label="Where you bought it" htmlFor="detail-bought">
                <Input id="detail-bought" value={draft.boughtAt ?? ""} maxLength={120} onChange={(e) => edit("boughtAt", e.target.value)} />
              </FormField>
              <FormField label="Purchase date" htmlFor="detail-date">
                <Input
                  id="detail-date"
                  type="date"
                  value={item.purchasedAt?.slice(0, 10) ?? ""}
                  max={new Date().toISOString().slice(0, 10)}
                  onChange={(e) => updateItem(item.id, { purchasedAt: e.target.value || null })}
                />
              </FormField>
            </div>
          ) : (
            <div className="space-y-3 rounded-card border border-rule bg-wash p-3">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <FormField label="Target price" htmlFor="detail-target">
                  <PriceField
                    id="detail-target"
                    label="Target price"
                    currency={item.currency}
                    lockCurrency
                    amount={item.targetPrice != null ? String(item.targetPrice) : ""}
                    onAmount={(v) => updateItem(item.id, { targetPrice: v ? Number(v) : null })}
                  />
                </FormField>
                <FormField label="Priority">
                  <Priority value={item.priority} onChange={(v) => updateItem(item.id, { priority: v })} />
                </FormField>
              </div>
              {item.sourceUrl ? (
                <>
                  {history && history.length > 1 && (
                    <Sparkline points={history.map((h) => h.price)} target={item.targetPrice ?? undefined} />
                  )}
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-caption text-ink-soft">
                    {atTarget && <span className="accent-pin label-caps rounded-full px-2 py-0.5">At your target</span>}
                    {item.lowestPrice != null && (
                      <span>
                        Lowest seen <span className="price">{money(item.lowestPrice)}</span>
                      </span>
                    )}
                    <span>
                      {item.lastCheckedAt
                        ? `Checked ${new Date(item.lastCheckedAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })}`
                        : "Not checked yet"}
                    </span>
                    <button disabled={!!busy} onClick={checkNow} className={link}>
                      {busy === "check" ? "Checking…" : "Check now"}
                    </button>
                  </div>
                  <Switch
                    on={item.priceAlert !== false}
                    onChange={(v) => updateItem(item.id, { priceAlert: v })}
                    label="Tell me when the price drops"
                  />
                </>
              ) : (
                <p className="text-caption text-ink-soft">Add the product link below to track its price.</p>
              )}
            </div>
          )}

          <FormField label="Notes" htmlFor="detail-notes">
            <Textarea id="detail-notes" value={draft.notes ?? ""} maxLength={2000} onChange={(e) => edit("notes", e.target.value)} rows={2} />
          </FormField>

          <FormField label="Product link" htmlFor="detail-link">
            <Input
              id="detail-link"
              value={draft.sourceUrl ?? ""}
              maxLength={4000}
              inputMode="url"
              onChange={(e) => {
                const v = e.target.value.trim();
                setDraft({ ...draft, sourceUrl: v });
                if (!v || /^https?:\/\/\S+\.\S+/.test(v)) save(item.id, { sourceUrl: v || null });
              }}
              placeholder="Optional"
            />
          </FormField>

          {wardrobes && wardrobes.length > 1 && (
            <FormField label="Move to another wardrobe" htmlFor="detail-move">
              <Select id="detail-move" value="" onChange={(e) => e.target.value && moveItemToWardrobe(item.id, e.target.value)}>
                <option value="">Choose a wardrobe…</option>
                {wardrobes
                  .filter((w) => w.id !== wardrobeId)
                  .map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.title}
                    </option>
                  ))}
              </Select>
            </FormField>
          )}

          <div className="mt-1 flex items-center justify-between gap-2">
            {item.sourceUrl ? (
              <a
                href={item.sourceUrl}
                target="_blank"
                rel="noreferrer noopener"
                className="inline-flex items-center gap-1 text-caption font-medium underline underline-offset-4"
              >
                Open link <ArrowUpRight aria-hidden className="h-3.5 w-3.5" />
              </a>
            ) : (
              <span />
            )}
            <Button size="sm" className="text-danger" onClick={() => deleteItem(item.id)}>
              Remove item
            </Button>
          </div>
        </div>
      </div>
    </Dialog>
  );
}

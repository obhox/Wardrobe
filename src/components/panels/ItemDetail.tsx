"use client";
import { motion } from "framer-motion";
import { useStore } from "@/lib/store";
import { SIZE_TIERS } from "@/lib/theme";
import type { ItemStatus, SizeTier } from "@/lib/types";

export default function ItemDetail() {
  const selectedId = useStore((s) => s.selectedId);
  const select = useStore((s) => s.select);
  const item = useStore((s) => s.payload?.items.find((i) => i.id === s.selectedId));
  const sections = useStore((s) => s.payload?.sections ?? []);
  const updateItem = useStore((s) => s.updateItem);
  const deleteItem = useStore((s) => s.deleteItem);

  if (!selectedId || !item) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <button aria-label="close" onClick={() => select(null)} className="absolute inset-0 bg-black/30" />
      <motion.div
        initial={{ opacity: 0, scale: 0.94 }}
        animate={{ opacity: 1, scale: 1 }}
        className="thin-scroll relative z-10 grid max-h-[90dvh] w-full max-w-2xl grid-cols-1 gap-5 overflow-y-auto rounded-2xl border border-rule bg-panel p-5 shadow-[0_24px_60px_var(--shadow)] sm:p-6 sm:grid-cols-[220px_1fr]"
      >
        <div className="flex items-center justify-center rounded-xl bg-ground/30 p-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={item.cutoutUrl || item.imageUrl}
            alt={item.name}
            className="max-h-52 max-w-full object-contain cutout-shadow"
          />
        </div>

        <div className="flex flex-col gap-3">
          <input
            value={item.name}
            onChange={(e) => updateItem(item.id, { name: e.target.value })}
            className="bg-transparent font-[family-name:var(--font-display)] text-xl lowercase outline-none"
          />

          <div className="flex flex-wrap gap-2 text-sm">
            <input
              value={item.brand ?? ""}
              onChange={(e) => updateItem(item.id, { brand: e.target.value })}
              placeholder="brand"
              className="rounded-lg border border-rule bg-ground/40 px-2 py-1 lowercase outline-none"
            />
            <input
              type="number"
              value={item.price ?? ""}
              onChange={(e) => updateItem(item.id, { price: e.target.value ? Number(e.target.value) : null })}
              placeholder="price"
              className="w-24 rounded-lg border border-rule bg-ground/40 px-2 py-1 outline-none"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {(["owned", "want"] as ItemStatus[]).map((st) => (
              <button
                key={st}
                onClick={() => updateItem(item.id, { status: st })}
                className={
                  "rounded-full px-3 py-1 text-xs lowercase " +
                  (item.status === st ? "bg-ink text-panel" : "border border-rule")
                }
              >
                {st}
              </button>
            ))}
            <select
              value={item.sectionId ?? ""}
              onChange={(e) => updateItem(item.id, { sectionId: e.target.value || null })}
              className="rounded-full border border-rule bg-ground/40 px-3 py-1 text-xs lowercase outline-none"
            >
              <option value="">unsorted</option>
              {sections.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs lowercase text-ink-soft">size</span>
            <div className="flex gap-1.5">
              {SIZE_TIERS.map((t) => (
                <button
                  key={t}
                  onClick={() => updateItem(item.id, { sizeTier: t as SizeTier })}
                  className={
                    "rounded-full px-2.5 py-1 text-xs lowercase " +
                    (item.sizeTier === t
                      ? "bg-ink text-panel"
                      : "border border-rule hover:bg-ink/5")
                  }
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          {item.status === "owned" ? (
            <input
              value={item.boughtAt ?? ""}
              onChange={(e) => updateItem(item.id, { boughtAt: e.target.value })}
              placeholder="where bought"
              className="rounded-lg border border-rule bg-ground/40 px-3 py-2 text-sm lowercase outline-none"
            />
          ) : (
            <input
              type="number"
              value={item.targetPrice ?? ""}
              onChange={(e) => updateItem(item.id, { targetPrice: e.target.value ? Number(e.target.value) : null })}
              placeholder="target price"
              className="rounded-lg border border-rule bg-ground/40 px-3 py-2 text-sm outline-none"
            />
          )}

          <textarea
            value={item.notes ?? ""}
            onChange={(e) => updateItem(item.id, { notes: e.target.value })}
            placeholder="notes…"
            rows={2}
            className="resize-none rounded-lg border border-rule bg-ground/40 px-3 py-2 text-sm lowercase outline-none"
          />

          <div className="mt-1 flex items-center justify-between">
            {item.sourceUrl ? (
              <a
                href={item.sourceUrl}
                target="_blank"
                rel="noreferrer"
                className="text-xs lowercase text-ink-soft underline underline-offset-4"
              >
                source ↗
              </a>
            ) : (
              <span />
            )}
            <div className="flex gap-2">
              <button
                onClick={() => {
                  if (confirm("remove this item?")) deleteItem(item.id);
                }}
                className="rounded-lg border border-rule px-3 py-1.5 text-xs lowercase hover:text-blush"
              >
                remove
              </button>
              <button
                onClick={() => select(null)}
                className="rounded-lg bg-ink px-4 py-1.5 text-xs lowercase text-panel"
              >
                done
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

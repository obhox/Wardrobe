"use client";
import { useCallback, useMemo, useState } from "react";
import { useStore } from "@/lib/store";
import { computeLayout, sectionRails, sortItems } from "@/lib/layout";
import { useIsNarrow } from "@/lib/hooks";
import type { Item, LayoutMode } from "@/lib/types";
import { TIER_SIZE } from "@/lib/theme";
import Cutout from "./Cutout";
import GalleryCard from "./GalleryCard";
import Sticker from "./Sticker";
import EmptyState from "./EmptyState";

const COLLAGE_KEY = "wardrobe:collage-on-phone";

function readCollagePref() {
  try {
    return localStorage.getItem(COLLAGE_KEY) === "1";
  } catch {
    return false;
  }
}

export default function Canvas() {
  const [size, setSize] = useState({ w: 0, h: 0 });
  const narrow = useIsNarrow();
  const [collageOnPhone, setCollageOnPhone] = useState(readCollagePref);

  const payload = useStore((s) => s.payload);
  const filter = useStore((s) => s.filter);
  const search = useStore((s) => s.search);
  const activeSection = useStore((s) => s.activeSection);

  // callback ref: re-attaches whenever the positioned container remounts
  // (e.g. coming back from the scrolling grid), so the size is never stale
  const measure = useCallback((el: HTMLDivElement | null) => {
    if (!el) return;
    const update = () => setSize({ w: el.clientWidth, h: el.clientHeight });
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const saved = payload?.wardrobe.layoutMode ?? "free";
  // phones: the free collage is a desktop delight (brief §25.5) — default to
  // a tidy grid, with an opt-in to see (and long-press-move) the collage
  const mode: LayoutMode = narrow && saved === "free" && !collageOnPhone ? "grid" : saved;

  // size tiers shrink a little on small canvases so collages don't pile up
  const scale = size.w ? Math.max(0.58, Math.min(1, size.w / 1050)) : 1;
  const maxCols = size.w ? Math.max(2, Math.floor(size.w / (TIER_SIZE.medium * scale * 1.15))) : undefined;

  const placements = useMemo(() => {
    if (!payload) return null;
    const pl = computeLayout(payload.items, payload.sections, mode, payload.wardrobe.sortKey, { maxCols });
    return pl ? new Map(pl.map((p) => [p.id, p])) : null;
  }, [payload, mode, maxCols]);

  if (!payload) return null;
  const { items, stickers, sections, wardrobe } = payload;
  const q = search.trim().toLowerCase();

  function dimmed(it: Item) {
    const matchFilter = filter === "all" || it.status === filter;
    const matchSection =
      !activeSection ||
      (activeSection === "__unsorted" ? !it.sectionId : it.sectionId === activeSection);
    const matchSearch =
      !q ||
      it.name.toLowerCase().includes(q) ||
      (it.brand ?? "").toLowerCase().includes(q) ||
      (it.notes ?? "").toLowerCase().includes(q);
    return !(matchFilter && matchSearch && matchSection);
  }

  const phoneToggle = narrow && saved === "free" && items.length > 0 && (
    <button
      data-noshot="true"
      onClick={() => {
        const next = !collageOnPhone;
        setCollageOnPhone(next);
        try {
          localStorage.setItem(COLLAGE_KEY, next ? "1" : "0");
        } catch {}
      }}
      className="absolute left-1/2 top-3 z-20 -translate-x-1/2 rounded-full border border-rule bg-panel/85 px-3 py-1 text-[11px] lowercase text-ink-soft backdrop-blur"
    >
      {collageOnPhone ? "collage · long-press to move — show tidy view" : "tidy view — show my collage"}
    </button>
  );

  // scrolling grid: a real CSS grid that grows and scrolls
  if (mode === "gallery") {
    const ordered = sortItems(items, wardrobe.sortKey, sections);
    return (
      <div className="relative h-full w-full overflow-y-auto overflow-x-hidden">
        {items.length === 0 ? (
          <EmptyState />
        ) : (
          <ul className="grid grid-cols-[repeat(auto-fill,minmax(116px,1fr))] gap-3 p-5 pb-32 sm:gap-4 sm:p-7 md:grid-cols-[repeat(auto-fill,minmax(150px,1fr))]">
            {ordered.map((it, i) => (
              <li key={it.id}>
                <GalleryCard item={it} index={i} dimmed={dimmed(it)} />
              </li>
            ))}
          </ul>
        )}
      </div>
    );
  }

  const rails = sectionRails(items, sections, mode);
  const draggable = mode === "free";

  return (
    <div ref={measure} className="relative h-full w-full">
      {phoneToggle}
      {size.w > 0 &&
        stickers.map((st) => <Sticker key={st.id} sticker={st} canvasW={size.w} canvasH={size.h} />)}

      {items.length === 0 ? (
        <EmptyState />
      ) : (
        size.w > 0 && (
          <>
            {rails.map((r) => (
              <div
                key={r.id}
                aria-hidden
                className="pointer-events-none absolute text-[11px] lowercase tracking-wide text-ink-soft"
                style={
                  mode === "shelves"
                    ? { left: 12, right: 12, top: r.y * size.h + 58 * scale, borderTop: "1px solid var(--rule)", paddingTop: 2, opacity: 0.75 }
                    : { left: r.x * size.w, top: 14, transform: "translateX(-50%)", opacity: 0.8 }
                }
              >
                {r.label}
              </div>
            ))}
            {items.map((it, i) => {
              const pl = placements?.get(it.id);
              // keep every cutout fully on the canvas (and, on phones, clear
              // of the control bar), whatever its stored position
              const half = (TIER_SIZE[it.sizeTier] * scale) / 2 + 6;
              const bottom = narrow ? 64 : 8;
              const fit = (v: number, span: number, lo: number, hi: number) =>
                span > lo + hi ? Math.min(span - hi, Math.max(lo, v * span)) / span : v;
              return (
                <Cutout
                  key={it.id}
                  item={it}
                  index={i}
                  posX={fit(pl?.posX ?? it.posX, size.w, half, half)}
                  posY={fit(pl?.posY ?? it.posY, size.h, half + (phoneToggle ? 34 : 0), half + bottom)}
                  rotation={pl?.rotation ?? it.rotation}
                  canvasW={size.w}
                  canvasH={size.h}
                  scale={scale}
                  draggable={draggable}
                  longPress={narrow}
                  dimmed={dimmed(it)}
                />
              );
            })}
          </>
        )
      )}
    </div>
  );
}

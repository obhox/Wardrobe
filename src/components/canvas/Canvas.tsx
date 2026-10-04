"use client";
import { useCallback, useState } from "react";
import { useStore } from "@/lib/store";
import { sortItems } from "@/lib/layout";
import { useIsDesktop } from "@/lib/hooks";
import type { Item, LayoutMode } from "@/lib/types";
import { TIER_SIZE } from "@/lib/theme";
import Cutout from "./Cutout";
import GalleryCard from "./GalleryCard";
import EmptyState from "./EmptyState";

export default function Canvas() {
  const [size, setSize] = useState({ w: 0, h: 0 });
  const desktop = useIsDesktop();

  const payload = useStore((s) => s.payload);
  const filter = useStore((s) => s.filter);
  const search = useStore((s) => s.search);
  const activeSection = useStore((s) => s.activeSection);

  // callback ref: re-attaches whenever the positioned container remounts
  // (e.g. coming back from the board), so the size is never stale
  const measure = useCallback((el: HTMLDivElement | null) => {
    if (!el) return;
    const update = () => setSize({ w: el.clientWidth, h: el.clientHeight });
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // the collage needs room to drag things around (brief §25.5), so phones
  // always get the scrolling board; the saved collage is untouched
  const mode: LayoutMode = desktop ? payload?.wardrobe.layoutMode ?? "free" : "grid";

  // size tiers shrink a little on small canvases so collages don't pile up
  const scale = size.w ? Math.max(0.58, Math.min(1, size.w / 1050)) : 1;

  if (!payload) return null;
  const { items, sections, wardrobe } = payload;
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

  // board: a real CSS grid that grows and scrolls
  if (mode === "grid") {
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

  // collage: every cutout sits where it was put
  return (
    <div ref={measure} className="relative h-full w-full">
      {items.length === 0 ? (
        <EmptyState />
      ) : (
        size.w > 0 &&
        items.map((it, i) => {
          // keep every cutout fully on the canvas, whatever its stored position
          const half = (TIER_SIZE[it.sizeTier] * scale) / 2 + 6;
          const fit = (v: number, span: number, lo: number, hi: number) =>
            span > lo + hi ? Math.min(span - hi, Math.max(lo, v * span)) / span : v;
          return (
            <Cutout
              key={it.id}
              item={it}
              index={i}
              posX={fit(it.posX, size.w, half, half)}
              posY={fit(it.posY, size.h, half, half + 8)}
              rotation={it.rotation}
              canvasW={size.w}
              canvasH={size.h}
              scale={scale}
              dimmed={dimmed(it)}
            />
          );
        })
      )}
    </div>
  );
}

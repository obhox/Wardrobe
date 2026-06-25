"use client";
import { useEffect, useRef, useState } from "react";
import { useStore } from "@/lib/store";
import { sortItems } from "@/lib/layout";
import Cutout from "./Cutout";
import GalleryCard from "./GalleryCard";
import Sticker from "./Sticker";
import EmptyState from "./EmptyState";

export default function Canvas() {
  const ref = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });

  const payload = useStore((s) => s.payload);
  const filter = useStore((s) => s.filter);
  const search = useStore((s) => s.search);
  const activeSection = useStore((s) => s.activeSection);

  useEffect(() => {
    if (!ref.current) return;
    const el = ref.current;
    const ro = new ResizeObserver(() => {
      setSize({ w: el.clientWidth, h: el.clientHeight });
    });
    ro.observe(el);
    setSize({ w: el.clientWidth, h: el.clientHeight });
    return () => ro.disconnect();
  }, []);

  if (!payload) return null;
  const { items, stickers, sections, wardrobe } = payload;
  const q = search.trim().toLowerCase();

  function dimmed(
    name: string,
    brand: string | null | undefined,
    status: string,
    sectionId: string | null | undefined
  ) {
    const matchFilter = filter === "all" || status === filter;
    const matchSection = !activeSection || sectionId === activeSection;
    const matchSearch =
      !q || name.toLowerCase().includes(q) || (brand ?? "").toLowerCase().includes(q);
    return !(matchFilter && matchSearch && matchSection);
  }

  // scrolling grid: a real CSS grid that grows in height and scrolls when
  // there are more items than fit the viewport.
  if (wardrobe.layoutMode === "gallery") {
    if (items.length === 0) {
      return (
        <div className="relative h-full w-full">
          <EmptyState />
        </div>
      );
    }
    const ordered = sortItems(items, wardrobe.sortKey, sections);
    return (
      <div className="h-full w-full overflow-y-auto overflow-x-hidden">
        <div className="grid grid-cols-[repeat(auto-fill,minmax(116px,1fr))] gap-3 p-5 pb-28 sm:gap-4 sm:p-7 md:grid-cols-[repeat(auto-fill,minmax(140px,1fr))]">
          {ordered.map((it, i) => (
            <GalleryCard
              key={it.id}
              item={it}
              index={i}
              dimmed={dimmed(it.name, it.brand, it.status, it.sectionId)}
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div ref={ref} className="relative h-full w-full">
      {items.length === 0 ? (
        <EmptyState />
      ) : (
        size.w > 0 && (
          <>
            {stickers.map((st) => (
              <Sticker key={st.id} sticker={st} canvasW={size.w} canvasH={size.h} />
            ))}
            {items.map((it, i) => (
              <Cutout
                key={it.id}
                item={it}
                index={i}
                canvasW={size.w}
                canvasH={size.h}
                dimmed={dimmed(it.name, it.brand, it.status, it.sectionId)}
              />
            ))}
          </>
        )
      )}
    </div>
  );
}

"use client";
import { motion } from "framer-motion";
import { useStore } from "@/lib/store";
import type { Item } from "@/lib/types";
import { proxiedSrc } from "@/lib/img";
import { formatMoney } from "@/lib/currency";

// A cell in the scrolling "gallery" grid. Laid out by CSS flow — no dragging —
// so the grid grows and the page scrolls when items pile up.
export default function GalleryCard({ item, index, dimmed }: { item: Item; index: number; dimmed: boolean }) {
  const select = useStore((s) => s.select);
  const selected = useStore((s) => s.selectedId === item.id);
  const price = formatMoney(item.price, item.currency);

  return (
    <motion.button
      type="button"
      layout
      initial={{ opacity: 0, y: 18, scale: 0.94 }}
      animate={{ opacity: dimmed ? 0.28 : 1, y: 0, scale: 1 }}
      transition={{ delay: Math.min(index * 0.02, 0.4), duration: 0.35, ease: "easeOut" }}
      whileHover={{ y: -4 }}
      onClick={() => select(item.id)}
      aria-label={`${item.name}${item.status === "want" ? ", want" : ""}`}
      className={
        "group relative flex aspect-square w-full flex-col items-center justify-center rounded-2xl border bg-panel/60 p-3 transition " +
        (selected ? "border-ink shadow-[0_10px_28px_var(--shadow)]" : "border-rule hover:bg-panel")
      }
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={proxiedSrc(item.cutoutUrl || item.imageUrl)}
        alt=""
        crossOrigin="anonymous"
        loading={index > 18 ? "lazy" : "eager"}
        decoding="async"
        draggable={false}
        className={
          "max-h-[74%] w-auto max-w-[88%] select-none object-contain " +
          (item.status === "want" ? "cutout-shadow-soft" : "cutout-shadow")
        }
        style={{ rotate: `${item.rotation / 2}deg` }}
      />
      {item.status === "want" && (
        <span className="accent-pin absolute right-2 top-2 rounded-full px-1.5 py-0.5 text-[10px] lowercase shadow">
          ✦ want
        </span>
      )}
      <span className="mt-2 w-full truncate text-center text-[11px] lowercase text-ink-soft">
        {item.name}
        {price ? ` · ${price}` : ""}
      </span>
    </motion.button>
  );
}

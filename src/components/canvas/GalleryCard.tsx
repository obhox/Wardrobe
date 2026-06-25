"use client";
import { motion } from "framer-motion";
import { useStore } from "@/lib/store";
import type { Item } from "@/lib/types";
import { proxiedSrc } from "@/lib/img";

interface Props {
  item: Item;
  index: number;
  dimmed: boolean;
}

// A single cell in the scrolling "gallery" grid (brief §16). Unlike Cutout
// this is laid out by CSS flow — no absolute positioning, no dragging — so the
// grid grows in height and the page scrolls when items pile up.
export default function GalleryCard({ item, index, dimmed }: Props) {
  const select = useStore((s) => s.select);
  const selectedId = useStore((s) => s.selectedId);
  const selected = selectedId === item.id;

  return (
    <motion.button
      layout
      initial={{ opacity: 0, y: 18, scale: 0.94 }}
      animate={{ opacity: dimmed ? 0.28 : 1, y: 0, scale: 1 }}
      transition={{ delay: Math.min(index * 0.025, 0.5), duration: 0.4, ease: "easeOut" }}
      whileHover={{ y: -4 }}
      onClick={() => select(item.id)}
      aria-label={`${item.name}${item.status === "want" ? " (want)" : ""}`}
      className={
        "group relative flex aspect-square flex-col items-center justify-center rounded-2xl border bg-panel/60 p-3 transition " +
        (selected ? "border-ink shadow-[0_10px_28px_var(--shadow)]" : "border-rule hover:bg-panel")
      }
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={proxiedSrc(item.cutoutUrl || item.imageUrl)}
        alt={item.name}
        crossOrigin="anonymous"
        draggable={false}
        className="cutout-shadow max-h-[78%] w-auto max-w-[88%] select-none object-contain"
        style={{
          rotate: `${item.rotation}deg`,
          filter:
            item.status === "want"
              ? "drop-shadow(0 12px 14px var(--shadow))"
              : undefined,
        }}
      />

      {/* want pin (brief §8) */}
      {item.status === "want" && (
        <span className="absolute right-2 top-2 rounded-full bg-blush px-1.5 py-0.5 text-[10px] lowercase text-white shadow">
          ✦ want
        </span>
      )}

      <span className="mt-2 w-full truncate text-center text-[11px] lowercase text-ink-soft">
        {item.name}
      </span>
    </motion.button>
  );
}

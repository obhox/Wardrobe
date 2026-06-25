"use client";
import { motion } from "framer-motion";
import { useState } from "react";
import { useStore } from "@/lib/store";
import type { Item } from "@/lib/types";
import { TIER_SIZE } from "@/lib/theme";
import { proxiedSrc } from "@/lib/img";

interface Props {
  item: Item;
  canvasW: number;
  canvasH: number;
  dimmed: boolean;
  index: number;
}

export default function Cutout({ item, canvasW, canvasH, dimmed, index }: Props) {
  const moveItem = useStore((s) => s.moveItem);
  const select = useStore((s) => s.select);
  const selectedId = useStore((s) => s.selectedId);
  const [dragging, setDragging] = useState(false);

  const size = TIER_SIZE[item.sizeTier];
  const left = item.posX * canvasW;
  const top = item.posY * canvasH;
  const selected = selectedId === item.id;

  return (
    <div
      className="absolute touch-none"
      style={{
        left,
        top,
        transform: "translate(-50%, -50%)",
        zIndex: selected ? 50 : dragging ? 40 : 10 + (index % 10),
      }}
    >
      <motion.div
        drag
        dragMomentum={false}
        onDragStart={() => setDragging(true)}
        onDragEnd={(_e, info) => {
          setDragging(false);
          const nx = Math.min(0.98, Math.max(0.02, item.posX + info.offset.x / canvasW));
          const ny = Math.min(0.98, Math.max(0.02, item.posY + info.offset.y / canvasH));
          moveItem(item.id, nx, ny);
        }}
        animate={{ x: 0, y: 0 }}
        transition={{ type: "spring", stiffness: 500, damping: 40 }}
        whileTap={{ scale: 1.04 }}
        className="cursor-grab active:cursor-grabbing"
        style={{ opacity: dimmed ? 0.28 : 1 }}
      >
        <motion.button
          initial={{ opacity: 0, y: 26, scale: 0.92 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ delay: Math.min(index * 0.06, 0.8), duration: 0.5, ease: "easeOut" }}
          onClick={() => !dragging && select(item.id)}
          className="group relative block"
          aria-label={`${item.name}${item.status === "want" ? " (want)" : ""}`}
        >
          <span
            className="floaty block"
            style={
              {
                "--rot": `${item.rotation}deg`,
                "--dur": `${6 + (index % 4)}s`,
                "--delay": `${(index % 5) * 0.4}s`,
              } as React.CSSProperties
            }
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={proxiedSrc(item.cutoutUrl || item.imageUrl)}
              alt={item.name}
              crossOrigin="anonymous"
              draggable={false}
              className="cutout-shadow select-none object-contain"
              style={{
                width: size,
                height: size,
                filter:
                  item.status === "want"
                    ? "drop-shadow(0 12px 14px var(--shadow))"
                    : undefined,
              }}
            />
          </span>

          {/* want pin (brief §8) */}
          {item.status === "want" && (
            <span className="absolute -right-1 -top-1 rounded-full bg-blush px-1.5 py-0.5 text-[10px] lowercase text-white shadow">
              ✦ want
            </span>
          )}

          {/* name tip on hover */}
          <span className="pointer-events-none absolute left-1/2 top-full mt-1 -translate-x-1/2 whitespace-nowrap rounded bg-ink/85 px-2 py-0.5 text-[11px] lowercase text-panel opacity-0 transition group-hover:opacity-100">
            {item.name}
          </span>
        </motion.button>
      </motion.div>
    </div>
  );
}

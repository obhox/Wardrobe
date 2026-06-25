"use client";
import { motion } from "framer-motion";
import { useState } from "react";
import { useStore } from "@/lib/store";
import type { Sticker as StickerT } from "@/lib/types";

const GLYPH: Record<StickerT["kind"], string> = {
  star: "✦",
  cat: "ฅ^•ﻌ•^ฅ",
  scribble: "〜",
  washi: "▰▱▰",
  shrug: "¯\\_(ツ)_/¯",
};

export default function Sticker({
  sticker,
  canvasW,
  canvasH,
}: {
  sticker: StickerT;
  canvasW: number;
  canvasH: number;
}) {
  const moveSticker = useStore((s) => s.moveSticker);
  const deleteSticker = useStore((s) => s.deleteSticker);
  const [dragging, setDragging] = useState(false);

  return (
    <motion.div
      drag
      dragMomentum={false}
      onDragStart={() => setDragging(true)}
      onDragEnd={(_e, info) => {
        setDragging(false);
        const nx = Math.min(0.99, Math.max(0.01, sticker.posX + info.offset.x / canvasW));
        const ny = Math.min(0.99, Math.max(0.01, sticker.posY + info.offset.y / canvasH));
        moveSticker(sticker.id, nx, ny);
      }}
      animate={{ x: 0, y: 0 }}
      onDoubleClick={() => deleteSticker(sticker.id)}
      title="double-click to remove"
      className="absolute cursor-grab select-none text-ink-soft active:cursor-grabbing"
      style={{
        left: sticker.posX * canvasW,
        top: sticker.posY * canvasH,
        transform: `translate(-50%,-50%) rotate(${sticker.rotation}deg) scale(${sticker.scale})`,
        zIndex: dragging ? 45 : 5,
        fontSize: 22,
      }}
    >
      {GLYPH[sticker.kind]}
    </motion.div>
  );
}

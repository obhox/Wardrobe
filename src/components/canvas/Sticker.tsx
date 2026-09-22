"use client";
import { motion, useMotionValue } from "framer-motion";
import { useLayoutEffect, useRef, useState } from "react";
import { useStore } from "@/lib/store";
import type { Sticker as StickerT } from "@/lib/types";
import { STICKER_LABEL } from "@/lib/stickers";
import StickerArt from "./StickerArt";

// A draggable decoration. Focus or hover shows small controls (rotate, size,
// remove); with the keyboard: arrows move, R rotates, +/- resize, Delete removes.
export default function Sticker({
  sticker,
  canvasW,
  canvasH,
}: {
  sticker: StickerT;
  canvasW: number;
  canvasH: number;
}) {
  const updateSticker = useStore((s) => s.updateSticker);
  const deleteSticker = useStore((s) => s.deleteSticker);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const ref = useRef<HTMLDivElement>(null);
  const dropping = useRef(false);
  const [dragging, setDragging] = useState(false);

  const left = sticker.posX * canvasW;
  const top = sticker.posY * canvasH;

  useLayoutEffect(() => {
    if (!dropping.current) return;
    dropping.current = false;
    x.jump(0);
    y.jump(0);
    if (ref.current) ref.current.style.transform = "none";
  }, [left, top, x, y]);

  const clamp = (v: number) => Math.min(0.99, Math.max(0.01, v));
  const rotate = (by: number) => updateSticker(sticker.id, { rotation: ((sticker.rotation + by + 540) % 360) - 180 });
  const resize = (by: number) =>
    updateSticker(sticker.id, { scale: Math.min(3, Math.max(0.5, Math.round((sticker.scale + by) * 10) / 10)) });

  return (
    <motion.div
      ref={ref}
      drag
      dragMomentum={false}
      onDragStart={() => setDragging(true)}
      onDragEnd={(_e, info) => {
        setDragging(false);
        dropping.current = true;
        updateSticker(sticker.id, {
          posX: clamp(sticker.posX + info.offset.x / canvasW),
          posY: clamp(sticker.posY + info.offset.y / canvasH),
        });
      }}
      style={{ x, y, left, top, zIndex: dragging ? 46 : 6 }}
      className="group absolute cursor-grab touch-none select-none active:cursor-grabbing"
    >
      <div
        tabIndex={0}
        role="img"
        aria-label={`${STICKER_LABEL[sticker.kind]} sticker — arrows move, r rotates, plus and minus resize, delete removes`}
        onKeyDown={(e) => {
          const step = e.shiftKey ? 0.05 : 0.01;
          const k = e.key;
          if (k === "Delete" || k === "Backspace") deleteSticker(sticker.id);
          else if (k === "r" || k === "R") rotate(e.shiftKey ? -15 : 15);
          else if (k === "+" || k === "=") resize(0.1);
          else if (k === "-") resize(-0.1);
          else if (k.startsWith("Arrow")) {
            const d = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] }[k]!;
            updateSticker(sticker.id, { posX: clamp(sticker.posX + d[0]), posY: clamp(sticker.posY + d[1]) });
          } else return;
          e.preventDefault();
        }}
        className="rounded-md outline-offset-4"
        style={{
          transform: `translate(-50%, -50%) rotate(${sticker.rotation}deg) scale(${sticker.scale})`,
        }}
      >
        <StickerArt kind={sticker.kind} />
      </div>

      {/* quiet controls on hover / focus */}
      <div
        data-noshot="true"
        className="absolute left-0 top-0 flex -translate-x-1/2 translate-y-[calc(-100%-18px)] gap-1 opacity-0 transition group-focus-within:opacity-100 group-hover:opacity-100 [@media(hover:none)]:hidden"
      >
        {[
          ["↻", "rotate", () => rotate(15)],
          ["−", "smaller", () => resize(-0.1)],
          ["+", "bigger", () => resize(0.1)],
          ["×", "remove sticker", () => deleteSticker(sticker.id)],
        ].map(([glyph, label, fn]) => (
          <button
            key={label as string}
            type="button"
            aria-label={label as string}
            onPointerDown={(e) => e.stopPropagation()}
            onClick={fn as () => void}
            className="h-6 w-6 rounded-full border border-rule bg-panel text-xs leading-none shadow"
          >
            {glyph as string}
          </button>
        ))}
      </div>
    </motion.div>
  );
}

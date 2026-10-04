"use client";
import { motion, useDragControls, useMotionValue, useReducedMotion } from "framer-motion";
import { memo, useLayoutEffect, useRef, useState } from "react";
import { useStore } from "@/lib/store";
import type { Item } from "@/lib/types";
import { TIER_SIZE } from "@/lib/theme";
import { ItemFigure } from "@/components/item/ItemTile";
import { toTile } from "@/components/item/toTile";

interface Props {
  item: Item;
  posX: number;
  posY: number;
  rotation: number;
  canvasW: number;
  canvasH: number;
  scale: number;
  dimmed: boolean;
  index: number;
}

const CLICK_SLOP = 5;
const GLIDE = "left 0.75s cubic-bezier(.2,.8,.2,1), top 0.75s cubic-bezier(.2,.8,.2,1)";

// Section row under a screen point (for drag-to-section in the directory).
function sectionAt(x: number, y: number): string | null {
  for (const el of document.elementsFromPoint(x, y)) {
    const id = (el as HTMLElement).closest?.<HTMLElement>("[data-section-drop]")?.dataset.sectionDrop;
    if (id) return id;
  }
  return null;
}

function Cutout({
  item,
  posX,
  posY,
  rotation,
  canvasW,
  canvasH,
  scale,
  dimmed,
  index,
}: Props) {
  const moveItem = useStore((s) => s.moveItem);
  const moveItemToSection = useStore((s) => s.moveItemToSection);
  const setDropSection = useStore((s) => s.setDropSection);
  const select = useStore((s) => s.select);
  const selected = useStore((s) => s.selectedId === item.id);
  const reduce = useReducedMotion();

  const controls = useDragControls();
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const wrapper = useRef<HTMLDivElement>(null);
  const moved = useRef(false);
  const dropping = useRef(false);
  // true for the commit that applies a drop, so left/top jump instead of glide
  const [settling, setSettling] = useState(false);
  const pressStart = useRef<{ x: number; y: number } | null>(null);
  const [dragging, setDragging] = useState(false);

  const size = Math.round(TIER_SIZE[item.sizeTier] * scale);
  const left = posX * canvasW;
  const top = posY * canvasH;

  // after a drop commits the new left/top, clear the drag offset in the same
  // frame so the cutout doesn't flash back to where it started
  useLayoutEffect(() => {
    if (!dropping.current) return;
    dropping.current = false;
    x.jump(0);
    y.jump(0);
    if (wrapper.current) wrapper.current.style.transform = "none";
    const raf = requestAnimationFrame(() => setSettling(false));
    return () => cancelAnimationFrame(raf);
  }, [left, top, x, y]);

  function onPointerDown(e: React.PointerEvent) {
    moved.current = false;
    pressStart.current = { x: e.clientX, y: e.clientY };
    if (e.button === 0) controls.start(e);
  }

  // a press that travels is a drag, not a tap that opens the item
  function onPointerMove(e: React.PointerEvent) {
    const s = pressStart.current;
    if (s && Math.hypot(e.clientX - s.x, e.clientY - s.y) > CLICK_SLOP) moved.current = true;
  }

  function nudge(dx: number, dy: number) {
    const nx = Math.min(0.98, Math.max(0.02, item.posX + dx));
    const ny = Math.min(0.98, Math.max(0.02, item.posY + dy));
    moveItem(item.id, nx, ny);
  }

  return (
    <motion.div
      ref={wrapper}
      drag
      dragControls={controls}
      dragListener={false}
      dragMomentum={false}
      style={{
        x,
        y,
        left,
        top,
        width: size,
        height: size,
        marginLeft: -size / 2,
        marginTop: -size / 2,
        zIndex: selected ? 50 : dragging ? 45 : 10 + (index % 20),
        transition: dragging || settling || reduce ? "none" : GLIDE,
        opacity: dimmed ? 0.26 : 1,
        touchAction: "none",
      }}
      className="absolute cursor-grab active:cursor-grabbing"
      onDragStart={() => {
        setDragging(true);
        moved.current = true;
      }}
      onDrag={(_e, info) => setDropSection(sectionAt(info.point.x - window.scrollX, info.point.y - window.scrollY))}
      onDragEnd={(_e, info) => {
        setDragging(false);
        const target = sectionAt(info.point.x - window.scrollX, info.point.y - window.scrollY);
        setDropSection(null);
        if (target) {
          // dropped on a directory section: file it there, put it back
          x.set(0);
          y.set(0);
          moveItemToSection(item.id, target === "__unsorted" ? null : target);
          return;
        }
        dropping.current = true;
        setSettling(true);
        const nx = Math.min(0.98, Math.max(0.02, posX + info.offset.x / canvasW));
        const ny = Math.min(0.98, Math.max(0.02, posY + info.offset.y / canvasH));
        moveItem(item.id, nx, ny);
      }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
    >
      <motion.button
        type="button"
        initial={reduce ? false : { opacity: 0, y: 26, scale: 0.92 }}
        animate={{ opacity: 1, y: 0, scale: dragging ? 1.06 : 1 }}
        transition={{ delay: dragging ? 0 : Math.min(index * 0.05, 0.8), duration: 0.45, ease: "easeOut" }}
        onClick={() => {
          if (!moved.current) select(item.id);
        }}
        onKeyDown={(e) => {
          const step = e.shiftKey ? 0.05 : 0.01;
          const moves: Record<string, [number, number]> = {
            ArrowLeft: [-step, 0],
            ArrowRight: [step, 0],
            ArrowUp: [0, -step],
            ArrowDown: [0, step],
          };
          const m = moves[e.key];
          if (m) {
            e.preventDefault();
            nudge(m[0], m[1]);
          }
        }}
        className="group relative block h-full w-full select-none rounded-card"
        aria-label={`${item.name}${item.status === "want" ? ", want" : ""} — arrow keys move it`}
        style={{ WebkitTouchCallout: "none" }}
      >
        <ItemFigure
          item={toTile(item)}
          size={size}
          float={
            {
              "--rot": `${rotation}deg`,
              "--dur": `${6 + (index % 4)}s`,
              "--delay": `${(index % 5) * 0.4}s`,
            } as React.CSSProperties
          }
          eager={index <= 24}
          crossOrigin="anonymous"
        />
      </motion.button>
    </motion.div>
  );
}

export default memo(Cutout);

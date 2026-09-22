"use client";
import { motion, useDragControls, useMotionValue, useReducedMotion } from "framer-motion";
import { memo, useLayoutEffect, useRef, useState } from "react";
import { useStore } from "@/lib/store";
import type { Item } from "@/lib/types";
import { TIER_SIZE } from "@/lib/theme";
import { proxiedSrc } from "@/lib/img";

interface Props {
  item: Item;
  posX: number;
  posY: number;
  rotation: number;
  canvasW: number;
  canvasH: number;
  scale: number;
  draggable: boolean;
  longPress: boolean;
  dimmed: boolean;
  index: number;
}

const LONG_PRESS_MS = 320;
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
  draggable,
  longPress,
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
  const pressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pressStart = useRef<{ x: number; y: number } | null>(null);
  const [dragging, setDragging] = useState(false);
  const [armed, setArmed] = useState(false); // long-press ready to move

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

  function clearPress() {
    if (pressTimer.current) clearTimeout(pressTimer.current);
    pressTimer.current = null;
  }

  function onPointerDown(e: React.PointerEvent) {
    moved.current = false;
    pressStart.current = { x: e.clientX, y: e.clientY };
    if (!draggable || e.button !== 0) return;
    if (e.pointerType === "mouse" || !longPress) {
      controls.start(e);
      return;
    }
    // touch on phones: hold to pick up, so a tap still opens the item
    const native = e.nativeEvent;
    clearPress();
    pressTimer.current = setTimeout(() => {
      setArmed(true);
      navigator.vibrate?.(8);
      controls.start(native);
    }, LONG_PRESS_MS);
  }

  function onPointerMove(e: React.PointerEvent) {
    const s = pressStart.current;
    if (s && Math.hypot(e.clientX - s.x, e.clientY - s.y) > CLICK_SLOP) {
      moved.current = true;
      if (!dragging) clearPress();
    }
  }

  function nudge(dx: number, dy: number) {
    const nx = Math.min(0.98, Math.max(0.02, item.posX + dx));
    const ny = Math.min(0.98, Math.max(0.02, item.posY + dy));
    moveItem(item.id, nx, ny);
  }

  return (
    <motion.div
      ref={wrapper}
      drag={draggable}
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
        touchAction: draggable && !longPress ? "none" : "manipulation",
      }}
      className={"absolute " + (draggable ? "cursor-grab active:cursor-grabbing" : "")}
      onDragStart={() => {
        setDragging(true);
        moved.current = true;
      }}
      onDrag={(_e, info) => setDropSection(sectionAt(info.point.x - window.scrollX, info.point.y - window.scrollY))}
      onDragEnd={(_e, info) => {
        setDragging(false);
        setArmed(false);
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
      onPointerUp={clearPress}
      onPointerCancel={() => {
        clearPress();
        setArmed(false);
      }}
      onContextMenu={(e) => longPress && e.preventDefault()}
    >
      <motion.button
        type="button"
        initial={reduce ? false : { opacity: 0, y: 26, scale: 0.92 }}
        animate={{ opacity: 1, y: 0, scale: armed || dragging ? 1.06 : 1 }}
        transition={{ delay: dragging ? 0 : Math.min(index * 0.05, 0.8), duration: 0.45, ease: "easeOut" }}
        onClick={() => {
          if (!moved.current) select(item.id);
        }}
        onKeyDown={(e) => {
          if (!draggable) return;
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
        className="group relative block h-full w-full select-none rounded-lg"
        aria-label={`${item.name}${item.status === "want" ? ", want" : ""}${draggable ? " — arrow keys move it" : ""}`}
        style={{ WebkitTouchCallout: "none" }}
      >
        <span
          className="floaty block h-full w-full"
          style={
            {
              "--rot": `${rotation}deg`,
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
            loading={index > 24 ? "lazy" : "eager"}
            decoding="async"
            draggable={false}
            className={
              "select-none object-contain " +
              (item.status === "want" ? "cutout-shadow-soft " : "cutout-shadow ") +
              // originals that were never cut out sit on a soft chip (brief §15 fallback)
              (item.cutoutUrl ? "" : "rounded-2xl bg-panel/55 p-1.5")
            }
            style={{ width: size, height: size }}
          />
        </span>

        {/* want pin (brief §8) */}
        {item.status === "want" && (
          <span className="accent-pin absolute -right-1 -top-1 rounded-full px-1.5 py-0.5 text-[10px] lowercase shadow">
            ✦ want
          </span>
        )}

        {/* name tip on hover / focus */}
        <span className="pointer-events-none absolute left-1/2 top-full z-10 mt-1 -translate-x-1/2 whitespace-nowrap rounded bg-ink/85 px-2 py-0.5 text-[11px] lowercase text-panel opacity-0 transition group-hover:opacity-100 group-focus-visible:opacity-100">
          {item.name}
        </span>
      </motion.button>
    </motion.div>
  );
}

export default memo(Cutout);

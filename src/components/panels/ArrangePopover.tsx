"use client";
import { motion } from "framer-motion";
import { useStore } from "@/lib/store";
import type { LayoutMode, SortKey } from "@/lib/types";

const LAYOUTS: { id: LayoutMode; label: string }[] = [
  { id: "free", label: "free / collage" },
  { id: "grid", label: "tidy grid" },
  { id: "gallery", label: "scrolling grid" },
  { id: "shelves", label: "shelves" },
  { id: "columns", label: "columns" },
];

const SORTS: { id: SortKey; label: string }[] = [
  { id: "recent", label: "recent" },
  { id: "color", label: "by color ✦" },
  { id: "section", label: "by section" },
  { id: "status", label: "by status" },
  { id: "az", label: "a–z" },
];

export default function ArrangePopover() {
  const setPanel = useStore((s) => s.setPanel);
  const wardrobe = useStore((s) => s.payload?.wardrobe);
  const setLayout = useStore((s) => s.setLayout);
  const setSort = useStore((s) => s.setSort);
  const tidyUp = useStore((s) => s.tidyUp);

  if (!wardrobe) return null;

  return (
    <div className="fixed inset-0 z-[55]" onClick={() => setPanel(null)}>
      <motion.div
        initial={{ opacity: 0, y: 10, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        onClick={(e) => e.stopPropagation()}
        className="absolute bottom-20 right-5 w-64 rounded-2xl border border-rule bg-panel p-4 shadow-[0_18px_44px_var(--shadow)]"
      >
        <div className="text-xs lowercase text-ink-soft">layout</div>
        <div className="mt-2 grid grid-cols-2 gap-1.5">
          {LAYOUTS.map((l) => (
            <button
              key={l.id}
              onClick={() => setLayout(l.id)}
              className={
                "rounded-lg px-2 py-1.5 text-xs lowercase " +
                (wardrobe.layoutMode === l.id ? "bg-ink text-panel" : "border border-rule hover:bg-ink/5")
              }
            >
              {l.label}
            </button>
          ))}
        </div>

        <div className="mt-4 text-xs lowercase text-ink-soft">sort</div>
        <div className="mt-2 flex flex-col gap-1">
          {SORTS.map((s) => (
            <button
              key={s.id}
              onClick={() => setSort(s.id)}
              className={
                "rounded-lg px-2 py-1.5 text-left text-xs lowercase " +
                (wardrobe.sortKey === s.id ? "bg-ink text-panel" : "hover:bg-ink/5")
              }
            >
              {s.label}
            </button>
          ))}
        </div>

        {wardrobe.layoutMode === "free" && (
          <button
            onClick={() => tidyUp()}
            className="mt-4 w-full rounded-lg border border-rule py-2 text-xs lowercase hover:bg-ink/5"
          >
            tidy up
          </button>
        )}
      </motion.div>
    </div>
  );
}

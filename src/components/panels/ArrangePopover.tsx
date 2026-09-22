"use client";
import { useStore } from "@/lib/store";
import type { LayoutMode, SortKey } from "@/lib/types";
import Dialog from "@/components/ui/Dialog";

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

// Layout × sort (brief §16). Arranged layouts are computed live, so your
// free-form collage is always there to come back to.
export default function ArrangePopover() {
  const setPanel = useStore((s) => s.setPanel);
  const wardrobe = useStore((s) => s.payload?.wardrobe);
  const setLayout = useStore((s) => s.setLayout);
  const setSort = useStore((s) => s.setSort);
  const tidyUp = useStore((s) => s.tidyUp);

  if (!wardrobe) return null;
  const free = wardrobe.layoutMode === "free";

  return (
    <Dialog title="arrange" variant="popover" onClose={() => setPanel(null)}>
      <div className="text-xs lowercase text-ink-soft">layout</div>
      <div className="mt-2 grid grid-cols-2 gap-1.5" role="radiogroup" aria-label="layout">
        {LAYOUTS.map((l) => (
          <button
            key={l.id}
            role="radio"
            aria-checked={wardrobe.layoutMode === l.id}
            onClick={() => setLayout(l.id)}
            className={
              "rounded-lg px-2 py-2 text-xs lowercase sm:py-1.5 " +
              (wardrobe.layoutMode === l.id ? "bg-ink text-panel" : "border border-rule hover:bg-ink/5")
            }
          >
            {l.label}
          </button>
        ))}
      </div>

      <div className="mt-4 text-xs lowercase text-ink-soft">sort</div>
      <div className="mt-2 flex flex-col gap-1" role="radiogroup" aria-label="sort">
        {SORTS.map((s) => (
          <button
            key={s.id}
            role="radio"
            aria-checked={wardrobe.sortKey === s.id}
            onClick={() => setSort(s.id)}
            className={
              "rounded-lg px-2 py-2 text-left text-xs lowercase sm:py-1.5 " +
              (wardrobe.sortKey === s.id ? "bg-ink text-panel" : "hover:bg-ink/5")
            }
          >
            {s.label}
          </button>
        ))}
      </div>

      {free ? (
        <>
          <button
            onClick={() => tidyUp()}
            className="mt-4 w-full rounded-lg border border-rule py-2 text-xs lowercase hover:bg-ink/5"
          >
            tidy up (follows the sort)
          </button>
          <p className="mt-2 text-[11px] lowercase text-ink-soft">
            the collage keeps your hand placement — sort applies when you tidy up, and to the other layouts.
          </p>
        </>
      ) : (
        <p className="mt-3 text-[11px] lowercase text-ink-soft">
          your free collage is kept — switch back any time.
        </p>
      )}
    </Dialog>
  );
}

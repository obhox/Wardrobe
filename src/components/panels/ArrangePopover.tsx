"use client";
import { Check } from "lucide-react";
import { useStore } from "@/lib/store";
import { useIsDesktop } from "@/lib/hooks";
import { cx } from "@/lib/cx";
import type { LayoutMode, SortKey } from "@/lib/types";
import Dialog from "@/components/ui/Dialog";
import { Button } from "@/components/ui/Button";
import { FormField } from "@/components/ui/Field";
import { Segmented } from "@/components/ui/Segmented";

const LAYOUTS: { value: LayoutMode; label: string }[] = [
  { value: "free", label: "Collage" },
  { value: "grid", label: "Board" },
];

const SORTS: { id: SortKey; label: string }[] = [
  { id: "recent", label: "Newest first" },
  { id: "color", label: "By colour" },
  { id: "section", label: "By section" },
  { id: "status", label: "Owned, then want" },
  { id: "az", label: "A to Z" },
];

// Layout × sort (brief §16). The board flows items live, so your hand-made
// collage is always there to come back to.
export default function ArrangePopover() {
  const setPanel = useStore((s) => s.setPanel);
  const wardrobe = useStore((s) => s.payload?.wardrobe);
  const setLayout = useStore((s) => s.setLayout);
  const setSort = useStore((s) => s.setSort);
  const tidyUp = useStore((s) => s.tidyUp);
  // phones always show the board, so the layout choice is desktop-only
  const desktop = useIsDesktop();

  if (!wardrobe) return null;
  const collage = desktop && wardrobe.layoutMode === "free";

  return (
    <Dialog title="Arrange" variant="popover" onClose={() => setPanel(null)}>
      {desktop && (
        <FormField label="Layout" className="mb-5">
          <Segmented label="Layout" value={wardrobe.layoutMode} onChange={setLayout} options={LAYOUTS} className="flex w-full" />
        </FormField>
      )}

      <FormField label="Sort">
        <div className="-mx-2 flex flex-col" role="radiogroup" aria-label="Sort">
          {SORTS.map((s) => {
            const on = wardrobe.sortKey === s.id;
            return (
              <button
                key={s.id}
                role="radio"
                aria-checked={on}
                onClick={() => setSort(s.id)}
                className={cx(
                  "flex h-9 items-center justify-between rounded-control px-2 text-left transition",
                  on ? "font-medium" : "text-ink-soft hover:bg-ink/4 hover:text-ink"
                )}
              >
                {s.label}
                {on && <Check aria-hidden className="h-4 w-4" />}
              </button>
            );
          })}
        </div>
      </FormField>

      {collage ? (
        <>
          <Button className="mt-4 w-full" onClick={() => tidyUp()}>
            Tidy up
          </Button>
          <p className="mt-2 text-caption text-ink-soft">
            The collage keeps where you put things. Tidying up rearranges it in the order above.
          </p>
        </>
      ) : (
        desktop && <p className="mt-3 text-caption text-ink-soft">Your collage is kept. Switch back any time.</p>
      )}
    </Dialog>
  );
}

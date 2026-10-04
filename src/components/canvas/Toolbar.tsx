"use client";
import { ChartNoAxesColumn, Palette, Plus, Share2, SlidersHorizontal } from "lucide-react";
import { useStore } from "@/lib/store";
import { Button } from "@/components/ui/Button";

const ACTIONS = [
  { panel: "stats", label: "Stats", Icon: ChartNoAxesColumn },
  { panel: "share", label: "Share", Icon: Share2 },
  { panel: "arrange", label: "Arrange", Icon: SlidersHorizontal },
  { panel: "beautify", label: "Appearance", Icon: Palette },
] as const;

// The open wardrobe's actions, above the stage on tablet and desktop. Phones
// carry the same actions in the top bar and the directory (see MobileBar).
export default function Toolbar() {
  const setPanel = useStore((s) => s.setPanel);
  const saving = useStore((s) => s.saving);
  const payload = useStore((s) => s.payload);
  const activeSection = useStore((s) => s.activeSection);
  if (!payload) return null;

  const { sections, items } = payload;
  const section = sections.find((s) => s.id === activeSection);
  const heading = activeSection === "__unsorted" ? "Unsorted" : section?.name ?? "Everything";
  const count =
    activeSection === "__unsorted"
      ? items.filter((i) => !i.sectionId).length
      : section
        ? section.count ?? 0
        : items.length;

  return (
    <div className="hidden h-14 shrink-0 items-center gap-0.5 pl-5 pr-3 md:flex">
      <h1 className="cap-first min-w-0 truncate font-display text-title">{heading}</h1>
      <span className="label-caps ml-2 shrink-0 whitespace-nowrap text-ink-faint">
        {count} {count === 1 ? "item" : "items"}
      </span>
      <span role="status" className="ml-3 mr-auto shrink-0 text-caption text-ink-soft">
        {saving ? "Saving…" : ""}
      </span>
      {ACTIONS.map(({ panel, label, Icon }) => (
        // labels need room: below a wide screen the icon stands alone
        <Button key={panel} variant="ghost" size="sm" aria-label={label} title={label} className="shrink-0 px-2.5 xl:px-3" onClick={() => setPanel(panel)}>
          <Icon aria-hidden className="h-4 w-4" />
          <span className="hidden xl:inline">{label}</span>
        </Button>
      ))}
      <Button variant="primary" size="sm" className="ml-2 shrink-0" onClick={() => setPanel("add")}>
        <Plus aria-hidden className="h-4 w-4" /> Add item
      </Button>
    </div>
  );
}

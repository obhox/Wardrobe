import type { Item, LayoutMode, SortKey, Section } from "./types";

// Positions are stored as fractions (0..1) of the canvas, so they survive
// canvas resizes. Arrange algorithms return new fractional positions.

/** A stored layout value → a current one. Layouts that were removed (shelves,
 *  columns, the old tidy grid and gallery) all read as the board. */
export function toLayoutMode(value: string | null | undefined): LayoutMode {
  return value === "free" ? "free" : "grid";
}

export function sortItems(
  items: Item[],
  sortKey: SortKey,
  sections: Section[]
): Item[] {
  const order = new Map(sections.map((s, i) => [s.id, i]));
  const copy = [...items];
  switch (sortKey) {
    case "recent":
      return copy.sort(
        (a, b) => +new Date(b.createdAt) - +new Date(a.createdAt)
      );
    case "color":
      // rainbow first, colourless (hue -1) items trail at the end
      return copy.sort((a, b) => (a.hue < 0 ? 999 : a.hue) - (b.hue < 0 ? 999 : b.hue));
    case "section":
      return copy.sort(
        (a, b) =>
          (order.get(a.sectionId ?? "") ?? 999) -
          (order.get(b.sectionId ?? "") ?? 999)
      );
    case "status":
      return copy.sort((a, b) => a.status.localeCompare(b.status));
    case "az":
      return copy.sort((a, b) => a.name.localeCompare(b.name));
    default:
      return copy;
  }
}

// A little deterministic jitter so a tidied collage never looks sterile (brief §16).
function jitter(seed: number, amount: number) {
  const x = Math.sin(seed * 99.7) * 10000;
  return (x - Math.floor(x) - 0.5) * 2 * amount;
}

export interface Placement {
  id: string;
  posX: number;
  posY: number;
  rotation: number;
}

// "tidy up" in free mode: scatter into a loose collage that avoids the corners,
// following the current sort (so "by color" tidies into a loose rainbow).
export function tidyScatter(items: Item[], sortKey: SortKey = "recent", sections: Section[] = []): Placement[] {
  return sortItems(items, sortKey, sections).map((it, i) => ({
    id: it.id,
    posX: 0.12 + ((i * 0.37 + jitter(i, 0.06) + 0.5) % 0.76),
    posY: 0.16 + ((i * 0.29 + jitter(i + 5, 0.06) + 0.5) % 0.68),
    rotation: jitter(i + 2, 12),
  }));
}

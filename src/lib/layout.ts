import type { Item, LayoutMode, SortKey, Section } from "./types";

// Positions are stored as fractions (0..1) of the canvas, so they survive
// canvas resizes. Arrange algorithms return new fractional positions.

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
      return copy.sort((a, b) => a.hue - b.hue);
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

// A little deterministic jitter so grids never look sterile (brief §16).
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

/**
 * Compute fractional placements for a given layout mode + sort key.
 * Returns null for "free" (keeps stored positions) and "gallery"
 * (a scrollable CSS grid that flows items rather than positioning them).
 */
export function computeLayout(
  items: Item[],
  sections: Section[],
  mode: LayoutMode,
  sortKey: SortKey
): Placement[] | null {
  if (mode === "free" || mode === "gallery") return null;

  const sorted = sortItems(items, sortKey, sections);

  if (mode === "grid") {
    const cols = Math.max(3, Math.ceil(Math.sqrt(sorted.length)) + 1);
    return sorted.map((it, i) => {
      const r = Math.floor(i / cols);
      const c = i % cols;
      return {
        id: it.id,
        posX: (c + 0.5) / cols + jitter(i + 1, 0.02),
        posY: (r + 0.7) / (Math.ceil(sorted.length / cols) + 1) +
          jitter(i + 7, 0.02),
        rotation: jitter(i + 3, 4),
      };
    });
  }

  // shelves & columns group by section
  const grouped = groupBySection(sorted, sections);

  if (mode === "shelves") {
    const rows = grouped.length;
    const out: Placement[] = [];
    grouped.forEach((group, r) => {
      const y = (r + 0.7) / (rows + 1);
      group.items.forEach((it, c) => {
        out.push({
          id: it.id,
          posX: (c + 0.6) / (group.items.length + 1),
          posY: y + jitter(r * 31 + c, 0.015),
          rotation: jitter(r * 13 + c, 3),
        });
      });
    });
    return out;
  }

  // columns: one column per section
  const colsN = grouped.length;
  const out: Placement[] = [];
  grouped.forEach((group, ci) => {
    const x = (ci + 0.6) / (colsN + 1);
    group.items.forEach((it, ri) => {
      out.push({
        id: it.id,
        posX: x + jitter(ci * 17 + ri, 0.015),
        posY: (ri + 0.7) / (group.items.length + 1),
        rotation: jitter(ci * 7 + ri, 3),
      });
    });
  });
  return out;
}

function groupBySection(items: Item[], sections: Section[]) {
  const order = [...sections].sort((a, b) => a.order - b.order);
  const groups = order.map((s) => ({
    section: s,
    items: items.filter((i) => i.sectionId === s.id),
  }));
  const unsorted = items.filter(
    (i) => !i.sectionId || !sections.some((s) => s.id === i.sectionId)
  );
  if (unsorted.length)
    groups.push({
      section: { id: "__unsorted", name: "unsorted", order: 999 },
      items: unsorted,
    });
  return groups.filter((g) => g.items.length > 0);
}

// "tidy up" in free mode: scatter into a loose collage that avoids the corners.
export function tidyScatter(items: Item[]): Placement[] {
  return items.map((it, i) => ({
    id: it.id,
    posX: 0.12 + ((i * 0.37 + jitter(i, 0.06) + 0.5) % 0.76),
    posY: 0.16 + ((i * 0.29 + jitter(i + 5, 0.06) + 0.5) % 0.68),
    rotation: jitter(i + 2, 12),
  }));
}

import { describe, expect, it } from "vitest";
import { sortItems, tidyScatter } from "../layout";
import type { Item, Section } from "../types";

function item(over: Partial<Item> & { id: string }): Item {
  return {
    imageUrl: "/x.webp",
    name: over.id,
    status: "owned",
    posX: 0.5,
    posY: 0.5,
    rotation: 0,
    sizeTier: "medium",
    hue: 0,
    sourceType: "manual",
    createdAt: "2026-01-01T00:00:00.000Z",
    ...over,
  };
}

const sections: Section[] = [
  { id: "tops", name: "tops", order: 0 },
  { id: "shoes", name: "shoes", order: 1 },
];

const ids = (items: Item[]) => items.map((i) => i.id);

describe("sortItems", () => {
  it("puts the newest first for recent", () => {
    const items = [
      item({ id: "old", createdAt: "2026-01-01T00:00:00.000Z" }),
      item({ id: "new", createdAt: "2026-03-01T00:00:00.000Z" }),
      item({ id: "mid", createdAt: "2026-02-01T00:00:00.000Z" }),
    ];
    expect(ids(sortItems(items, "recent", sections))).toEqual(["new", "mid", "old"]);
  });

  it("orders by hue and trails colourless items", () => {
    const items = [item({ id: "none", hue: -1 }), item({ id: "blue", hue: 220 }), item({ id: "red", hue: 5 })];
    expect(ids(sortItems(items, "color", sections))).toEqual(["red", "blue", "none"]);
  });

  it("follows section order and puts unsorted items last", () => {
    const items = [
      item({ id: "loose" }),
      item({ id: "boot", sectionId: "shoes" }),
      item({ id: "shirt", sectionId: "tops" }),
    ];
    expect(ids(sortItems(items, "section", sections))).toEqual(["shirt", "boot", "loose"]);
  });

  it("sorts by name for az and by status with owned first", () => {
    const items = [item({ id: "b", status: "want" }), item({ id: "a" }), item({ id: "c" })];
    expect(ids(sortItems(items, "az", sections))).toEqual(["a", "b", "c"]);
    expect(sortItems(items, "status", sections).at(-1)?.id).toBe("b");
  });

  it("leaves the input array untouched", () => {
    const items = [item({ id: "b" }), item({ id: "a" })];
    sortItems(items, "az", sections);
    expect(ids(items)).toEqual(["b", "a"]);
  });
});

describe("tidyScatter", () => {
  const items = Array.from({ length: 40 }, (_, i) => item({ id: `i${i}` }));

  it("places every item inside the canvas margins", () => {
    const out = tidyScatter(items);
    expect(out).toHaveLength(items.length);
    for (const p of out) {
      expect(p.posX).toBeGreaterThanOrEqual(0.12);
      expect(p.posX).toBeLessThan(0.88);
      expect(p.posY).toBeGreaterThanOrEqual(0.16);
      expect(p.posY).toBeLessThan(0.84);
    }
  });

  it("gives the same arrangement for the same input", () => {
    expect(tidyScatter(items)).toEqual(tidyScatter(items));
  });
});

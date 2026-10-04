import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Item, WardrobePayload } from "../types";

vi.mock("../api", () => ({
  api: { get: vi.fn(), post: vi.fn(), patch: vi.fn().mockResolvedValue({}), del: vi.fn() },
}));

import { api } from "../api";
import { useStore } from "../store";

function item(id: string): Item {
  return {
    id,
    imageUrl: "/x.webp",
    name: id,
    status: "owned",
    posX: 0.5,
    posY: 0.5,
    rotation: 0,
    sizeTier: "medium",
    hue: 0,
    sourceType: "manual",
    createdAt: "2026-01-01T00:00:00.000Z",
  };
}

function wardrobe(id: string, items: Item[]): WardrobePayload {
  return {
    wardrobe: { id, title: id, theme: "paper", layoutMode: "free", sortKey: "recent", handle: "moth", visibility: "private" },
    sections: [],
    items,
    wardrobes: [],
  };
}

describe("saving moved items", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.mocked(api.patch).mockClear();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("saves a move once the pause after dragging has passed", async () => {
    useStore.getState().init(wardrobe("a", [item("x")]));
    useStore.getState().moveItem("x", 0.2, 0.3);
    expect(api.patch).not.toHaveBeenCalled();

    await vi.runAllTimersAsync();
    expect(api.patch).toHaveBeenCalledWith(
      "/api/items/positions",
      { positions: [{ id: "x", posX: 0.2, posY: 0.3, rotation: 0 }] },
      { keepalive: true }
    );
  });

  it("still saves a move when another wardrobe opens before the pause is over", async () => {
    useStore.getState().init(wardrobe("a", [item("x")]));
    useStore.getState().moveItem("x", 0.2, 0.3, 12);
    useStore.getState().init(wardrobe("b", [item("y")]));

    await vi.runAllTimersAsync();
    expect(api.patch).toHaveBeenCalledTimes(1);
    expect(api.patch).toHaveBeenCalledWith(
      "/api/items/positions",
      { positions: [{ id: "x", posX: 0.2, posY: 0.3, rotation: 12 }] },
      { keepalive: true }
    );
  });

  it("keeps a failed save to send again with the next one", async () => {
    vi.mocked(api.patch).mockRejectedValueOnce(new Error("offline"));
    useStore.getState().init(wardrobe("a", [item("x"), item("z")]));
    useStore.getState().moveItem("x", 0.2, 0.3);
    await vi.runAllTimersAsync();

    useStore.getState().moveItem("z", 0.7, 0.7);
    await vi.runAllTimersAsync();
    expect(vi.mocked(api.patch).mock.calls.at(-1)?.[1]).toEqual({
      positions: [
        { id: "x", posX: 0.2, posY: 0.3, rotation: 0 },
        { id: "z", posX: 0.7, posY: 0.7, rotation: 0 },
      ],
    });
  });
});

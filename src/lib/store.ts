"use client";
import { create } from "zustand";
import { api } from "./api";
import { computeLayout, tidyScatter } from "./layout";
import type {
  WardrobePayload,
  Item,
  Section,
  Sticker,
  LayoutMode,
  SortKey,
  WardrobeTheme,
  StickerKind,
} from "./types";

type Filter = "all" | "owned" | "want";
type Panel = "add" | "arrange" | "beautify" | "share" | "account" | null;

interface State {
  payload: WardrobePayload | null;
  filter: Filter;
  search: string;
  activeSection: string | null;
  selectedId: string | null;
  openPanel: Panel;
  saving: boolean;

  init: (p: WardrobePayload) => void;
  setFilter: (f: Filter) => void;
  setSearch: (s: string) => void;
  setSection: (id: string | null) => void;
  select: (id: string | null) => void;
  setPanel: (p: Panel) => void;

  addItem: (input: Partial<Item> & { imageUrl: string; name: string }) => Promise<void>;
  updateItem: (id: string, patch: Partial<Item>) => Promise<void>;
  deleteItem: (id: string) => Promise<void>;
  moveItem: (id: string, posX: number, posY: number, rotation?: number) => void;

  addSection: (name: string, color?: string) => Promise<void>;
  updateSection: (id: string, patch: Partial<Section>) => Promise<void>;
  deleteSection: (id: string) => Promise<void>;
  moveItemToSection: (itemId: string, sectionId: string | null) => Promise<void>;

  setShare: (enabled: boolean) => Promise<void>;
  setShareDetails: (details: boolean) => Promise<void>;
  setTheme: (patch: Partial<WardrobeTheme>) => Promise<void>;
  setTitle: (title: string, tagline?: string) => Promise<void>;
  setLayout: (mode: LayoutMode) => Promise<void>;
  setSort: (key: SortKey) => Promise<void>;
  tidyUp: () => Promise<void>;

  addSticker: (kind: StickerKind) => Promise<void>;
  moveSticker: (id: string, posX: number, posY: number) => void;
  deleteSticker: (id: string) => Promise<void>;
}

let saveTimer: ReturnType<typeof setTimeout> | null = null;

function recount(payload: WardrobePayload): Section[] {
  const counts = new Map<string, number>();
  for (const it of payload.items)
    if (it.sectionId) counts.set(it.sectionId, (counts.get(it.sectionId) ?? 0) + 1);
  return payload.sections.map((s) => ({ ...s, count: counts.get(s.id) ?? 0 }));
}

export const useStore = create<State>((set, get) => ({
  payload: null,
  filter: "all",
  search: "",
  activeSection: null,
  selectedId: null,
  openPanel: null,
  saving: false,

  init: (p) => set({ payload: { ...p, sections: recount(p) } }),
  setFilter: (filter) => set({ filter }),
  setSearch: (search) => set({ search }),
  setSection: (activeSection) => set({ activeSection }),
  select: (selectedId) => set({ selectedId }),
  setPanel: (openPanel) => set({ openPanel }),

  addItem: async (input) => {
    const created: Item = await api.post("/api/items", input);
    set((s) => {
      if (!s.payload) return s;
      const payload = { ...s.payload, items: [...s.payload.items, created] };
      return { payload: { ...payload, sections: recount(payload) }, selectedId: created.id };
    });
  },

  updateItem: async (id, patch) => {
    set((s) => {
      if (!s.payload) return s;
      const items = s.payload.items.map((it) => (it.id === id ? { ...it, ...patch } : it));
      const payload = { ...s.payload, items };
      return { payload: { ...payload, sections: recount(payload) } };
    });
    try {
      await api.patch(`/api/items/${id}`, patch);
    } catch {
      /* keep optimistic state; a reload will reconcile */
    }
  },

  deleteItem: async (id) => {
    set((s) => {
      if (!s.payload) return s;
      const items = s.payload.items.filter((it) => it.id !== id);
      const payload = { ...s.payload, items };
      return {
        payload: { ...payload, sections: recount(payload) },
        selectedId: s.selectedId === id ? null : s.selectedId,
      };
    });
    await api.del(`/api/items/${id}`).catch(() => {});
  },

  moveItem: (id, posX, posY, rotation) => {
    set((s) => {
      if (!s.payload) return s;
      const items = s.payload.items.map((it) =>
        it.id === id ? { ...it, posX, posY, ...(rotation != null ? { rotation } : {}) } : it
      );
      return { payload: { ...s.payload, items } };
    });
    // debounced batch persist (brief §23)
    if (saveTimer) clearTimeout(saveTimer);
    set({ saving: true });
    saveTimer = setTimeout(async () => {
      const items = get().payload?.items ?? [];
      const positions = items.map((it) => ({
        id: it.id,
        posX: it.posX,
        posY: it.posY,
        rotation: it.rotation,
      }));
      await api.patch("/api/items/positions", { positions }).catch(() => {});
      set({ saving: false });
    }, 700);
  },

  addSection: async (name, color) => {
    const created: Section = await api.post("/api/sections", { name, color, icon: "✦" });
    set((s) => {
      if (!s.payload) return s;
      const payload = {
        ...s.payload,
        sections: [...s.payload.sections, { ...created, count: 0 }],
      };
      return { payload };
    });
  },

  updateSection: async (id, patch) => {
    set((s) => {
      if (!s.payload) return s;
      const sections = s.payload.sections.map((sec) =>
        sec.id === id ? { ...sec, ...patch } : sec
      );
      return { payload: { ...s.payload, sections } };
    });
    await api.patch(`/api/sections/${id}`, patch).catch(() => {});
  },

  deleteSection: async (id) => {
    set((s) => {
      if (!s.payload) return s;
      const sections = s.payload.sections.filter((sec) => sec.id !== id);
      const items = s.payload.items.map((it) =>
        it.sectionId === id ? { ...it, sectionId: null } : it
      );
      const payload = { ...s.payload, sections, items };
      return { payload: { ...payload, sections: recount(payload) } };
    });
    await api.del(`/api/sections/${id}`).catch(() => {});
  },

  moveItemToSection: async (itemId, sectionId) => {
    await get().updateItem(itemId, { sectionId });
  },

  setShare: async (enabled) => {
    const res: {
      visibility: string;
      shareCode: string | null;
      shareDetails: boolean;
    } = await api.post("/api/wardrobe/share", { enabled });
    set((s) => {
      if (!s.payload) return s;
      return {
        payload: {
          ...s.payload,
          wardrobe: {
            ...s.payload.wardrobe,
            visibility: res.visibility,
            shareCode: res.shareCode,
            shareDetails: res.shareDetails,
          },
        },
      };
    });
  },

  setShareDetails: async (details) => {
    set((s) => {
      if (!s.payload) return s;
      return {
        payload: {
          ...s.payload,
          wardrobe: { ...s.payload.wardrobe, shareDetails: details },
        },
      };
    });
    await api.post("/api/wardrobe/share", { details }).catch(() => {});
  },

  setTheme: async (patch) => {
    set((s) => {
      if (!s.payload) return s;
      return {
        payload: {
          ...s.payload,
          wardrobe: { ...s.payload.wardrobe, theme: { ...s.payload.wardrobe.theme, ...patch } },
        },
      };
    });
    await api.patch("/api/wardrobe", patch).catch(() => {});
  },

  setTitle: async (title, tagline) => {
    set((s) => {
      if (!s.payload) return s;
      return {
        payload: { ...s.payload, wardrobe: { ...s.payload.wardrobe, title, tagline } },
      };
    });
    await api.patch("/api/wardrobe", { title, tagline }).catch(() => {});
  },

  setLayout: async (mode) => {
    set((s) => {
      if (!s.payload) return s;
      return {
        payload: { ...s.payload, wardrobe: { ...s.payload.wardrobe, layoutMode: mode } },
      };
    });
    await api.patch("/api/wardrobe", { layoutMode: mode }).catch(() => {});
    await applyArrange(set, get);
  },

  setSort: async (key) => {
    set((s) => {
      if (!s.payload) return s;
      return {
        payload: { ...s.payload, wardrobe: { ...s.payload.wardrobe, sortKey: key } },
      };
    });
    await api.patch("/api/wardrobe", { sortKey: key }).catch(() => {});
    await applyArrange(set, get);
  },

  tidyUp: async () => {
    const payload = get().payload;
    if (!payload) return;
    const placements = tidyScatter(payload.items);
    applyPlacements(set, placements);
    await persistPositions(get);
  },

  addSticker: async (kind) => {
    const created: Sticker = await api.post("/api/stickers", {
      kind,
      posX: 0.5,
      posY: 0.5,
      rotation: (Math.random() - 0.5) * 30,
    });
    set((s) => {
      if (!s.payload) return s;
      return { payload: { ...s.payload, stickers: [...s.payload.stickers, created] } };
    });
  },

  moveSticker: (id, posX, posY) => {
    set((s) => {
      if (!s.payload) return s;
      const stickers = s.payload.stickers.map((st) =>
        st.id === id ? { ...st, posX, posY } : st
      );
      return { payload: { ...s.payload, stickers } };
    });
    if (saveTimer) clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      const st = get().payload?.stickers.find((x) => x.id === id);
      if (st) api.patch(`/api/stickers/${id}`, { posX: st.posX, posY: st.posY }).catch(() => {});
    }, 600);
  },

  deleteSticker: async (id) => {
    set((s) => {
      if (!s.payload) return s;
      return {
        payload: { ...s.payload, stickers: s.payload.stickers.filter((x) => x.id !== id) },
      };
    });
    await api.del(`/api/stickers/${id}`).catch(() => {});
  },
}));

// ----- helpers that need set/get -----

type Set = (fn: (s: State) => Partial<State> | State) => void;
type Get = () => State;

function applyPlacements(
  set: Set,
  placements: { id: string; posX: number; posY: number; rotation: number }[]
) {
  const map = new Map(placements.map((p) => [p.id, p]));
  set((s) => {
    if (!s.payload) return s;
    const items = s.payload.items.map((it) => {
      const p = map.get(it.id);
      return p ? { ...it, posX: p.posX, posY: p.posY, rotation: p.rotation } : it;
    });
    return { payload: { ...s.payload, items } };
  });
}

async function applyArrange(set: Set, get: Get) {
  const payload = get().payload;
  if (!payload) return;
  const { layoutMode, sortKey } = payload.wardrobe;
  const placements = computeLayout(payload.items, payload.sections, layoutMode, sortKey);
  if (!placements) return; // free mode keeps positions
  applyPlacements(set, placements);
  await persistPositions(get);
}

async function persistPositions(get: Get) {
  const items = get().payload?.items ?? [];
  const positions = items.map((it) => ({
    id: it.id,
    posX: it.posX,
    posY: it.posY,
    rotation: it.rotation,
  }));
  await api.patch("/api/items/positions", { positions }).catch(() => {});
}

export type { Filter, Panel };
export { recount };

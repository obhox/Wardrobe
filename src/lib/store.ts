"use client";
import { create } from "zustand";
import { api } from "./api";
import { tidyScatter } from "./layout";
import { setStorageBase } from "./img";
import type {
  WardrobePayload,
  Item,
  Section,
  LayoutMode,
  SortKey,
  ThemeId,
} from "./types";

type Filter = "all" | "owned" | "want";
type Panel = "add" | "arrange" | "beautify" | "share" | "stats" | null;

export interface Toast {
  id: number;
  message: string;
  tone?: "info" | "error";
  undo?: () => void;
}

interface State {
  payload: WardrobePayload | null;
  filter: Filter;
  search: string;
  activeSection: string | null;
  selectedId: string | null;
  openPanel: Panel;
  saving: boolean;
  toasts: Toast[];
  // section row under a dragged cutout (drop target highlight)
  dropSection: string | null;

  init: (p: WardrobePayload) => void;
  reset: () => void;
  setFilter: (f: Filter) => void;
  setSearch: (s: string) => void;
  setSection: (id: string | null) => void;
  select: (id: string | null) => void;
  setPanel: (p: Panel) => void;
  setDropSection: (id: string | null) => void;
  toast: (message: string, opts?: { tone?: Toast["tone"]; undo?: () => void; ms?: number }) => void;
  dismissToast: (id: number) => void;

  addItem: (input: Partial<Item> & { imageUrl: string; name: string }) => Promise<Item>;
  updateItem: (id: string, patch: Partial<Item>) => Promise<void>;
  replaceItem: (item: Item) => void;
  deleteItem: (id: string) => void;
  moveItem: (id: string, posX: number, posY: number, rotation?: number) => void;
  moveItemToWardrobe: (id: string, wardrobeId: string) => Promise<void>;

  addSection: (name: string, opts?: { color?: string; icon?: string }) => Promise<void>;
  updateSection: (id: string, patch: Partial<Section>) => Promise<void>;
  reorderSections: (ids: string[]) => Promise<void>;
  deleteSection: (id: string) => void;
  moveItemToSection: (itemId: string, sectionId: string | null) => Promise<void>;

  setShare: (enabled: boolean) => Promise<void>;
  rotateShare: () => Promise<void>;
  setShareDetails: (details: boolean) => Promise<void>;
  setSectionsShared: (shared: boolean) => Promise<void>;
  setTheme: (theme: ThemeId) => Promise<void>;
  setTitle: (patch: { title?: string; tagline?: string | null; icon?: string | null }) => Promise<void>;
  setLayout: (mode: LayoutMode) => Promise<void>;
  setSort: (key: SortKey) => Promise<void>;
  tidyUp: () => void;

  flush: () => Promise<void>;
}

const UNDO_MS = 5000;

// ---- module-level bookkeeping (not render state) ----
let positionTimer: ReturnType<typeof setTimeout> | null = null;
// where items were moved to, waiting to be saved. The position is captured
// here rather than read back later, so a save still sends the right thing after
// another wardrobe has replaced the payload.
const dirtyPositions = new Map<string, { posX: number; posY: number; rotation: number }>();
const pendingDeletes = new Map<string, { url: string; timer: ReturnType<typeof setTimeout> }>();
let toastSeq = 0;

function recount(payload: WardrobePayload): Section[] {
  const counts = new Map<string, number>();
  for (const it of payload.items)
    if (it.sectionId) counts.set(it.sectionId, (counts.get(it.sectionId) ?? 0) + 1);
  return payload.sections.map((s) => ({ ...s, count: counts.get(s.id) ?? 0 }));
}

function withItems(p: WardrobePayload, items: Item[]): WardrobePayload {
  const next = { ...p, items };
  return { ...next, sections: recount(next) };
}

function errMessage(e: unknown, fallback: string) {
  return e instanceof Error && e.message ? e.message : fallback;
}

export const useStore = create<State>((set, get) => {
  // Optimistic update: apply now, roll back (and say so) if the server refuses.
  async function optimistic(
    apply: (p: WardrobePayload) => WardrobePayload,
    request: () => Promise<unknown>,
    failMsg: string
  ) {
    const before = get().payload;
    if (!before) return;
    set({ payload: apply(before) });
    try {
      await request();
    } catch (e) {
      get().toast(errMessage(e, failMsg), { tone: "error" });
      // reconcile with the server rather than guessing which edits to undo
      await reload(before.wardrobe.id);
    }
  }

  async function reload(wardrobeId: string) {
    try {
      const fresh: WardrobePayload = await api.get(`/api/wardrobes/${wardrobeId}`);
      if (get().payload?.wardrobe.id === wardrobeId) {
        set({ payload: { ...fresh, sections: recount(fresh) } });
      }
    } catch {
      /* offline — keep what we have */
    }
  }

  // Remove now, delete on the server after the undo window closes.
  function deferDelete(key: string, url: string, restore: () => void, message: string) {
    const timer = setTimeout(() => {
      pendingDeletes.delete(key);
      api.del(url).catch((e) => {
        restore();
        get().toast(errMessage(e, "Couldn't remove that, so it's back."), { tone: "error" });
      });
    }, UNDO_MS);
    pendingDeletes.set(key, { url, timer });
    get().toast(message, {
      ms: UNDO_MS,
      undo: () => {
        const pending = pendingDeletes.get(key);
        if (pending) clearTimeout(pending.timer);
        pendingDeletes.delete(key);
        restore();
      },
    });
  }

  const wid = () => get().payload?.wardrobe.id;

  function patchWardrobe(patch: Partial<WardrobePayload["wardrobe"]>) {
    const p = get().payload;
    if (p) set({ payload: { ...p, wardrobe: { ...p.wardrobe, ...patch } } });
  }

  return {
    payload: null,
    filter: "all",
    search: "",
    activeSection: null,
    selectedId: null,
    openPanel: null,
    saving: false,
    toasts: [],
    dropSection: null,

    init: (p) => {
      // a move made in the wardrobe being left is saved before it is replaced
      if (positionTimer) {
        clearTimeout(positionTimer);
        positionTimer = null;
        void persistPositions();
      }
      setStorageBase(p.storageBase);
      set({
        payload: { ...p, sections: recount(p) },
        filter: "all",
        search: "",
        activeSection: null,
        selectedId: null,
        openPanel: null,
        dropSection: null,
      });
    },
    reset: () =>
      set({
        payload: null,
        filter: "all",
        search: "",
        activeSection: null,
        selectedId: null,
        openPanel: null,
        toasts: [],
        dropSection: null,
      }),
    setFilter: (filter) => set({ filter }),
    setSearch: (search) => set({ search }),
    setSection: (activeSection) => set({ activeSection }),
    select: (selectedId) => set({ selectedId }),
    setPanel: (openPanel) => set({ openPanel }),
    setDropSection: (dropSection) => {
      if (get().dropSection !== dropSection) set({ dropSection });
    },

    toast: (message, opts = {}) => {
      const id = ++toastSeq;
      set((s) => ({ toasts: [...s.toasts.slice(-2), { id, message, tone: opts.tone, undo: opts.undo }] }));
      setTimeout(() => get().dismissToast(id), opts.ms ?? (opts.tone === "error" ? 6000 : 3500));
    },
    dismissToast: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),

    // ---------------- items ----------------

    addItem: async (input) => {
      const created: Item = await api.post("/api/items", { ...input, wardrobeId: wid() });
      const p = get().payload;
      if (p && created.wardrobeId === p.wardrobe.id) {
        set({
          payload: {
            ...withItems(p, [...p.items, created]),
            wardrobes: p.wardrobes.map((w) => (w.id === p.wardrobe.id ? { ...w, count: w.count + 1 } : w)),
          },
        });
      }
      return created;
    },

    updateItem: (id, patch) =>
      optimistic(
        (p) => withItems(p, p.items.map((it) => (it.id === id ? { ...it, ...patch } : it))),
        async () => {
          const saved: Item = await api.patch(`/api/items/${id}`, patch);
          // server may normalise (stored image URLs, lowest price…)
          get().replaceItem(saved);
        },
        "Couldn't save that change."
      ),

    replaceItem: (item) => {
      const p = get().payload;
      if (!p) return;
      set({ payload: withItems(p, p.items.map((it) => (it.id === item.id ? { ...it, ...item } : it))) });
    },

    deleteItem: (id) => {
      const p = get().payload;
      const item = p?.items.find((i) => i.id === id);
      if (!p || !item) return;
      const index = p.items.indexOf(item);
      set({
        payload: {
          ...withItems(p, p.items.filter((it) => it.id !== id)),
          wardrobes: p.wardrobes.map((w) => (w.id === p.wardrobe.id ? { ...w, count: w.count - 1 } : w)),
        },
        selectedId: get().selectedId === id ? null : get().selectedId,
      });
      deferDelete(
        `item:${id}`,
        `/api/items/${id}`,
        () => {
          const cur = get().payload;
          if (!cur || cur.items.some((i) => i.id === id)) return;
          const items = [...cur.items];
          items.splice(Math.min(index, items.length), 0, item);
          set({
            payload: {
              ...withItems(cur, items),
              wardrobes: cur.wardrobes.map((w) => (w.id === cur.wardrobe.id ? { ...w, count: w.count + 1 } : w)),
            },
          });
        },
        `Removed ${item.name}`
      );
    },

    moveItem: (id, posX, posY, rotation) => {
      const p = get().payload;
      if (!p) return;
      set({
        payload: {
          ...p,
          items: p.items.map((it) =>
            it.id === id ? { ...it, posX, posY, ...(rotation != null ? { rotation } : {}) } : it
          ),
        },
      });
      markMoved([id]);
      schedulePositions();
    },

    moveItemToWardrobe: async (id, wardrobeId) => {
      const p = get().payload;
      const item = p?.items.find((i) => i.id === id);
      if (!p || !item || wardrobeId === p.wardrobe.id) return;
      await optimistic(
        (cur) => ({
          ...withItems(cur, cur.items.filter((i) => i.id !== id)),
          wardrobes: cur.wardrobes.map((w) =>
            w.id === cur.wardrobe.id ? { ...w, count: w.count - 1 } : w.id === wardrobeId ? { ...w, count: w.count + 1 } : w
          ),
        }),
        () => api.patch(`/api/items/${id}`, { wardrobeId }),
        "Couldn't move that item."
      );
      set({ selectedId: null });
      const dest = get().payload?.wardrobes.find((w) => w.id === wardrobeId);
      get().toast(`Moved ${item.name} to ${dest?.title ?? "another wardrobe"}`);
    },

    // ---------------- sections ----------------

    addSection: async (name, opts = {}) => {
      try {
        const created: Section = await api.post("/api/sections", {
          name,
          color: opts.color ?? null,
          icon: opts.icon ?? "✦",
          wardrobeId: wid(),
        });
        const p = get().payload;
        if (p) set({ payload: { ...p, sections: [...p.sections, { ...created, count: 0 }] } });
      } catch (e) {
        get().toast(errMessage(e, "Couldn't add that section."), { tone: "error" });
      }
    },

    updateSection: (id, patch) =>
      optimistic(
        (p) => ({ ...p, sections: p.sections.map((s) => (s.id === id ? { ...s, ...patch } : s)) }),
        () => api.patch(`/api/sections/${id}`, patch),
        "Couldn't save that section."
      ),

    reorderSections: (ids) =>
      optimistic(
        (p) => {
          const byId = new Map(p.sections.map((s) => [s.id, s]));
          const sections = ids.map((id, order) => ({ ...byId.get(id)!, order })).filter((s) => s.id);
          return { ...p, sections };
        },
        () => api.patch("/api/sections", { order: ids, wardrobeId: wid() }),
        "Couldn't reorder the sections."
      ),

    deleteSection: (id) => {
      const p = get().payload;
      const section = p?.sections.find((s) => s.id === id);
      if (!p || !section) return;
      const memberIds = new Set(p.items.filter((i) => i.sectionId === id).map((i) => i.id));
      const sections = p.sections.filter((s) => s.id !== id);
      const items = p.items.map((it) => (it.sectionId === id ? { ...it, sectionId: null } : it));
      set({
        payload: withItems({ ...p, sections }, items),
        activeSection: get().activeSection === id ? null : get().activeSection,
      });
      deferDelete(
        `section:${id}`,
        `/api/sections/${id}`,
        () => {
          const cur = get().payload;
          if (!cur || cur.sections.some((s) => s.id === id)) return;
          const restored = [...cur.sections, section].sort((a, b) => a.order - b.order);
          const back = cur.items.map((it) => (memberIds.has(it.id) && !it.sectionId ? { ...it, sectionId: id } : it));
          set({ payload: withItems({ ...cur, sections: restored }, back) });
        },
        `Removed the section ${section.name}. Its items are now unsorted.`
      );
    },

    moveItemToSection: async (itemId, sectionId) => {
      await get().updateItem(itemId, { sectionId });
    },

    // ---------------- sharing & look ----------------

    setShare: async (enabled) => {
      const res = await api.post("/api/wardrobe/share", { enabled, wardrobeId: wid() });
      patchWardrobe({ visibility: res.visibility, shareCode: res.shareCode, shareDetails: res.shareDetails });
    },

    rotateShare: async () => {
      const res = await api.post("/api/wardrobe/share", { rotate: true, wardrobeId: wid() });
      patchWardrobe({ visibility: res.visibility, shareCode: res.shareCode, shareDetails: res.shareDetails });
    },

    setShareDetails: async (details) => {
      const p = get().payload;
      if (!p) return;
      await optimistic(
        (cur) => ({ ...cur, wardrobe: { ...cur.wardrobe, shareDetails: details } }),
        () => api.post("/api/wardrobe/share", { details, wardrobeId: wid() }),
        "Couldn't update sharing."
      );
    },

    setSectionsShared: async (shared) => {
      const p = get().payload;
      if (!p) return;
      await optimistic(
        (cur) => ({ ...cur, sections: cur.sections.map((s) => ({ ...s, shared })) }),
        () => Promise.all(p.sections.map((s) => api.patch(`/api/sections/${s.id}`, { shared }))),
        "Couldn't update the sections."
      );
    },

    setTheme: (theme) =>
      optimistic(
        (p) => ({ ...p, wardrobe: { ...p.wardrobe, theme } }),
        () => api.patch(`/api/wardrobes/${wid()}`, { theme }),
        "Couldn't save the theme."
      ),

    setTitle: (patch) =>
      optimistic(
        (p) => ({
          ...p,
          wardrobe: { ...p.wardrobe, ...patch },
          wardrobes: p.wardrobes.map((w) =>
            w.id === p.wardrobe.id
              ? { ...w, ...(patch.title ? { title: patch.title } : {}), ...(patch.icon !== undefined ? { icon: patch.icon } : {}) }
              : w
          ),
        }),
        () => api.patch(`/api/wardrobes/${wid()}`, patch),
        "Couldn't save the title."
      ),

    // The board flows items at render time (see Canvas), so switching to it
    // never overwrites the hand-made collage stored in posX/posY.
    setLayout: (layoutMode) =>
      optimistic(
        (p) => ({ ...p, wardrobe: { ...p.wardrobe, layoutMode } }),
        () => api.patch(`/api/wardrobes/${wid()}`, { layoutMode }),
        "Couldn't save the layout."
      ),

    setSort: (sortKey) =>
      optimistic(
        (p) => ({ ...p, wardrobe: { ...p.wardrobe, sortKey } }),
        () => api.patch(`/api/wardrobes/${wid()}`, { sortKey }),
        "Couldn't save the sort order."
      ),

    tidyUp: () => {
      const p = get().payload;
      if (!p) return;
      const placements = new Map(
        tidyScatter(p.items, p.wardrobe.sortKey, p.sections).map((pl) => [pl.id, pl])
      );
      const before = p.items;
      set({
        payload: {
          ...p,
          items: p.items.map((it) => {
            const pl = placements.get(it.id);
            return pl ? { ...it, posX: pl.posX, posY: pl.posY, rotation: pl.rotation } : it;
          }),
        },
      });
      markMoved(placements.keys());
      schedulePositions(0);
      get().toast("Tidied up", {
        undo: () => {
          const cur = get().payload;
          if (!cur) return;
          const old = new Map(before.map((i) => [i.id, i]));
          set({
            payload: {
              ...cur,
              items: cur.items.map((it) => {
                const o = old.get(it.id);
                return o ? { ...it, posX: o.posX, posY: o.posY, rotation: o.rotation } : it;
              }),
            },
          });
          markMoved(old.keys());
          schedulePositions(0);
        },
      });
    },

    // Push pending saves/deletes right away (before navigating or unload).
    flush: async () => {
      if (positionTimer) {
        clearTimeout(positionTimer);
        positionTimer = null;
        await persistPositions();
      }
      for (const [key, d] of pendingDeletes) {
        clearTimeout(d.timer);
        pendingDeletes.delete(key);
        await fetch(d.url, { method: "DELETE", credentials: "same-origin", keepalive: true }).catch(() => {});
      }
    },
  };

  function schedulePositions(delay = 700) {
    if (positionTimer) clearTimeout(positionTimer);
    set({ saving: true });
    positionTimer = setTimeout(() => {
      positionTimer = null;
      persistPositions();
    }, delay);
  }

  function markMoved(ids: Iterable<string>) {
    const moved = new Set(ids);
    for (const it of get().payload?.items ?? []) {
      if (moved.has(it.id)) dirtyPositions.set(it.id, { posX: it.posX, posY: it.posY, rotation: it.rotation });
    }
  }

  async function persistPositions() {
    const positions = [...dirtyPositions].map(([id, pos]) => ({ id, ...pos }));
    dirtyPositions.clear();
    try {
      // keepalive so a save started on page hide still completes
      if (positions.length) await api.patch("/api/items/positions", { positions }, { keepalive: true });
    } catch {
      // retry with the next save, unless the item has moved again since
      for (const { id, ...pos } of positions) if (!dirtyPositions.has(id)) dirtyPositions.set(id, pos);
      get().toast("Couldn't save positions. Will retry.", { tone: "error" });
    } finally {
      set({ saving: false });
    }
  }
});

// Flush pending work when the tab is hidden/closed so nothing is lost.
if (typeof window !== "undefined") {
  window.addEventListener("pagehide", () => {
    useStore.getState().flush();
  });
}

export type { Filter, Panel };
export { recount };

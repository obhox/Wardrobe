"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";
import { useStore } from "@/lib/store";
import type { AppNotification } from "@/lib/types";

// Price-drop / target-hit notices from the price tracker.
export default function Notifications() {
  const select = useStore((s) => s.select);
  const items = useStore((s) => s.payload?.items);
  const [open, setOpen] = useState(false);
  const [list, setList] = useState<AppNotification[]>([]);
  const [unread, setUnread] = useState(0);
  const box = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    try {
      const r = await api.get("/api/notifications");
      setList(r.notifications);
      setUnread(r.unread);
    } catch {
      /* quiet */
    }
  }, []);

  useEffect(() => {
    // first load after mount, then every few minutes while open in a tab
    const first = setTimeout(load, 0);
    const iv = setInterval(load, 5 * 60 * 1000);
    return () => {
      clearTimeout(first);
      clearInterval(iv);
    };
  }, [load]);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent | KeyboardEvent) => {
      if (e instanceof KeyboardEvent ? e.key === "Escape" : !box.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", close);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", close);
    };
  }, [open]);

  async function toggle() {
    const next = !open;
    setOpen(next);
    if (next && unread) {
      setUnread(0);
      api.patch("/api/notifications").catch(() => {});
    }
  }

  return (
    <div ref={box} className="relative">
      <button
        onClick={toggle}
        aria-expanded={open}
        aria-label={unread ? `Alerts, ${unread} new` : "Alerts"}
        className="relative rounded py-1 underline-offset-4 hover:text-ink hover:underline"
      >
        Alerts
        {unread > 0 && (
          <span className="accent-pin absolute -right-3.5 -top-1 min-w-4 rounded-full px-1 text-center font-mono text-label leading-4">
            {unread}
          </span>
        )}
      </button>
      {open && (
        <div className="absolute bottom-full left-0 z-50 mb-2 w-[min(18rem,calc(100vw-2rem))] rounded-card border border-rule bg-panel p-2 text-ink shadow-card">
          {list.length === 0 ? (
            <p className="p-2 text-caption text-ink-soft">
              No alerts yet. Items you want that have a product link are checked for price drops once a day.
            </p>
          ) : (
            <ul className="thin-scroll max-h-72 overflow-y-auto">
              {list.map((n) => {
                const here = n.itemId && items?.some((i) => i.id === n.itemId);
                return (
                  <li key={n.id}>
                    <button
                      disabled={!here}
                      onClick={() => {
                        if (here) select(n.itemId);
                        setOpen(false);
                      }}
                      className="cap-first w-full rounded-control px-2 py-1.5 text-left text-caption hover:bg-ink/4 disabled:cursor-default disabled:hover:bg-transparent"
                    >
                      <span className={n.readAt ? "text-ink-soft" : ""}>
                        {n.kind === "target_hit" ? "◎ " : "↓ "}
                        {n.body}
                      </span>
                      <span className="label-caps block text-ink-faint">
                        {new Date(n.createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

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
        aria-label={unread ? `notifications, ${unread} new` : "notifications"}
        className="relative underline-offset-4 hover:text-ink hover:underline"
      >
        alerts
        {unread > 0 && (
          <span className="accent-pin absolute -right-3 -top-2 min-w-4 rounded-full px-1 text-center text-[10px] leading-4">
            {unread}
          </span>
        )}
      </button>
      {open && (
        <div className="absolute bottom-full left-0 z-50 mb-2 w-72 rounded-xl border border-rule bg-panel p-2 text-ink shadow-[0_18px_40px_var(--shadow)]">
          {list.length === 0 ? (
            <p className="p-2 text-xs lowercase text-ink-soft">
              no alerts yet. want items with a link are checked for price drops a few times a day.
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
                      className="w-full rounded-lg px-2 py-1.5 text-left text-xs lowercase hover:bg-ink/5 disabled:cursor-default disabled:hover:bg-transparent"
                    >
                      <span className={n.readAt ? "text-ink-soft" : ""}>
                        {n.kind === "target_hit" ? "◎ " : "↓ "}
                        {n.body}
                      </span>
                      <span className="block text-[10px] text-ink-soft">
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

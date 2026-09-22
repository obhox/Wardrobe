"use client";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { formatMoney } from "@/lib/currency";

export interface GuestItem {
  id: string;
  src: string; // already a displayable URL (signed proxy or our bucket)
  cut?: boolean;
  name: string;
  status: "owned" | "want";
  size: number;
  posX: number;
  posY: number;
  rotation: number;
  // detail fields (only present when the owner shares details)
  brand?: string | null;
  price?: number | null;
  currency?: string | null;
  boughtAt?: string | null;
  notes?: string | null;
  sourceUrl?: string | null;
}

// Read-only item on the shared guest canvas. When `details` is on, tapping the
// item opens a small info card (name, brand, price, where bought, notes, link).
// In `gallery` mode it renders as a flowing grid cell instead of an absolutely
// positioned cutout, so the shared view scrolls just like the owner's.
export default function GuestCutout({
  item,
  details,
  gallery = false,
}: {
  item: GuestItem;
  details: boolean;
  gallery?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const price = formatMoney(item.price, item.currency);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  // sizes scale with the screen like the studio does (brief §15 tiers are
  // desktop sizes), and every cutout stays fully inside the viewport
  const px = `min(${item.size}px, max(${Math.round(item.size * 0.58)}px, ${(item.size / 10.5).toFixed(2)}vw))`;
  const half = `(${px} / 2 + 8px)`;

  return (
    <div
      className={gallery ? "relative" : "absolute"}
      style={
        gallery
          ? { zIndex: open ? 50 : 10 }
          : {
              left: `clamp(calc${half}, ${item.posX * 100}%, calc(100% - ${half}))`,
              top: `clamp(calc${half} + 64px, ${item.posY * 100}%, calc(100% - ${half} - 44px))`,
              transform: `translate(-50%,-50%) rotate(${item.rotation}deg)`,
              zIndex: open ? 50 : 10,
            }
      }
    >
      <button
        type="button"
        onClick={() => details && setOpen((v) => !v)}
        className={
          "group relative block " +
          (details ? "cursor-pointer " : "cursor-default ") +
          (gallery
            ? "flex aspect-square w-full flex-col items-center justify-center rounded-2xl border border-rule bg-panel/60 p-3"
            : "")
        }
        aria-label={item.name}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={item.src}
          alt={item.name}
          loading="lazy"
          className={"object-contain " + (item.status === "want" ? "cutout-shadow-soft " : "cutout-shadow ") + (item.cut ? "" : "rounded-2xl bg-panel/55 p-1.5")}
          style={
            gallery
              ? { maxWidth: "88%", maxHeight: "82%", rotate: `${item.rotation}deg` }
              : { width: px, height: px }
          }
        />
        {item.status === "want" && (
          <span className="accent-pin absolute -right-1 -top-1 rounded-full px-1.5 py-0.5 text-[10px] lowercase shadow">
            ✦ want
          </span>
        )}
        {details && !open && (
          <span className="pointer-events-none absolute left-1/2 top-full mt-1 -translate-x-1/2 whitespace-nowrap rounded bg-ink/85 px-2 py-0.5 text-[11px] lowercase text-panel opacity-0 transition group-hover:opacity-100">
            {item.name}
            {price ? ` · ${price}` : ""}
          </span>
        )}
      </button>

      {details &&
        open &&
        createPortal(
          <div
            role="dialog"
            aria-label={item.name}
            className="fixed inset-x-3 bottom-[max(3.5rem,calc(env(safe-area-inset-bottom)+3rem))] z-50 mx-auto max-w-sm rounded-2xl border border-rule bg-panel p-4 text-left shadow-[0_18px_44px_var(--shadow)]"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="font-[family-name:var(--font-display)] text-sm lowercase">{item.name}</div>
                {item.brand && <div className="text-xs lowercase text-ink-soft">{item.brand}</div>}
              </div>
              <button onClick={() => setOpen(false)} aria-label="close" className="-mr-1 -mt-1 rounded px-2 py-1 text-sm text-ink-soft hover:text-ink">
                ×
              </button>
            </div>
            <div className="mt-1 flex items-center gap-2 text-xs lowercase">
              {price && <span>{price}</span>}
              <span className="rounded-full border border-rule px-1.5 py-0.5 text-[10px]">{item.status}</span>
            </div>
            {item.boughtAt && <div className="mt-1 text-[11px] lowercase text-ink-soft">from {item.boughtAt}</div>}
            {item.notes && <div className="mt-1 text-[11px] lowercase text-ink-soft">{item.notes}</div>}
            {item.sourceUrl && (
              <a
                href={item.sourceUrl}
                target="_blank"
                rel="noreferrer noopener nofollow"
                className="mt-2 inline-block py-1 text-[11px] lowercase underline underline-offset-4"
              >
                view item ↗
              </a>
            )}
          </div>,
          document.body
        )}
    </div>
  );
}

"use client";
import { useState } from "react";
import { proxiedSrc } from "@/lib/img";

export interface GuestItem {
  id: string;
  src: string;
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

function money(price?: number | null, currency?: string | null) {
  if (price == null) return null;
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: currency || "USD",
      maximumFractionDigits: 2,
    }).format(price);
  } catch {
    return `${currency || "$"}${price}`;
  }
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
  const price = money(item.price, item.currency);

  return (
    <div
      className={gallery ? "relative" : "absolute"}
      style={
        gallery
          ? { zIndex: open ? 50 : 10 }
          : {
              left: `${item.posX * 100}%`,
              top: `${item.posY * 100}%`,
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
          src={proxiedSrc(item.src)}
          alt={item.name}
          crossOrigin="anonymous"
          className="cutout-shadow object-contain"
          style={
            gallery
              ? { maxWidth: "88%", maxHeight: "82%", rotate: `${item.rotation}deg` }
              : { width: item.size, height: item.size }
          }
        />
        {item.status === "want" && (
          <span className="absolute -right-1 -top-1 rounded-full bg-blush px-1.5 py-0.5 text-[10px] lowercase text-white shadow">
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

      {details && open && (
        <div
          className="absolute left-1/2 top-full z-20 mt-2 w-56 -translate-x-1/2 rounded-xl border border-rule bg-panel p-3 text-left shadow-[0_18px_44px_var(--shadow)]"
          style={{ transform: `translate(-50%,0) rotate(${-item.rotation}deg)` }}
        >
          <div className="font-[family-name:var(--font-display)] text-sm lowercase">{item.name}</div>
          {item.brand && <div className="text-xs lowercase text-ink-soft">{item.brand}</div>}
          <div className="mt-1 flex items-center gap-2 text-xs lowercase">
            {price && <span>{price}</span>}
            <span className="rounded-full border border-rule px-1.5 py-0.5 text-[10px]">
              {item.status}
            </span>
          </div>
          {item.boughtAt && (
            <div className="mt-1 text-[11px] lowercase text-ink-soft">from {item.boughtAt}</div>
          )}
          {item.notes && (
            <div className="mt-1 text-[11px] lowercase text-ink-soft">{item.notes}</div>
          )}
          {item.sourceUrl && (
            <a
              href={item.sourceUrl}
              target="_blank"
              rel="noreferrer"
              className="mt-2 inline-block text-[11px] lowercase underline underline-offset-4"
            >
              view item ↗
            </a>
          )}
        </div>
      )}
    </div>
  );
}

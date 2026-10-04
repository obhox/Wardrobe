"use client";
import { useState } from "react";
import { ArrowUpRight } from "lucide-react";
import { formatMoney } from "@/lib/currency";
import { cx } from "@/lib/cx";
import Dialog from "@/components/ui/Dialog";
import ItemTile, { ItemFigure, type TileItem } from "./ItemTile";

export interface GuestItem extends TileItem {
  id: string;
  /** longest edge in the collage, at desktop size */
  size: number;
  posX: number;
  posY: number;
  rotation: number;
  // only present when the owner shares details
  boughtAt?: string | null;
  notes?: string | null;
  sourceUrl?: string | null;
}

// The items on a shared wardrobe: a scrolling board, and — when the owner
// keeps a collage — the collage from tablet width up, like the owner's own
// view. With `details` on, an item opens a card with what the owner shared.
export default function GuestItems({
  items,
  details,
  collage,
}: {
  items: GuestItem[];
  details: boolean;
  collage: boolean;
}) {
  const [openId, setOpenId] = useState<string | null>(null);
  const open = items.find((i) => i.id === openId);
  const price = open ? formatMoney(open.price, open.currency) : null;

  // an item is only a button when there is something to open
  function cell(it: GuestItem, className: string, style: React.CSSProperties | undefined, children: React.ReactNode) {
    return details ? (
      <button type="button" key={it.id} onClick={() => setOpenId(it.id)} aria-label={it.name} className={className} style={style}>
        {children}
      </button>
    ) : (
      <div key={it.id} className={className} style={style}>
        {children}
      </div>
    );
  }

  return (
    <>
      <ul
        className={cx(
          "grid grid-cols-[repeat(auto-fill,minmax(148px,1fr))] gap-x-4 gap-y-6 px-4 pb-24 pt-28 sm:px-6 xl:grid-cols-[repeat(auto-fill,minmax(176px,1fr))] md:gap-x-5 md:gap-y-8 md:px-8",
          collage && "md:hidden"
        )}
      >
        {items.map((it) => (
          <li key={it.id}>{cell(it, "block w-full rounded-card", undefined, <ItemTile item={it} meta={details} />)}</li>
        ))}
      </ul>

      {collage && (
        <div className="relative hidden h-dvh w-full md:block">
          {items.map((it) => {
            // tier sizes are desktop sizes; they scale with the screen like the
            // owner's canvas, and every cutout stays inside the viewport
            const px = `min(${it.size}px, max(${Math.round(it.size * 0.58)}px, ${(it.size / 10.5).toFixed(2)}vw))`;
            const half = `(${px} / 2 + 8px)`;
            return cell(
              it,
              "group absolute",
              {
                left: `clamp(calc${half}, ${it.posX * 100}%, calc(100% - ${half}))`,
                top: `clamp(calc${half} + 72px, ${it.posY * 100}%, calc(100% - ${half} - 44px))`,
                transform: `translate(-50%,-50%) rotate(${it.rotation}deg)`,
              },
              <ItemFigure item={it} size={px} tip={details} />
            );
          })}
        </div>
      )}

      {open && (
        <Dialog title={open.name} onClose={() => setOpenId(null)} className="sm:max-w-sm">
          <div className="space-y-2">
            {open.brand && <p className="cap-first text-ink-soft">{open.brand}</p>}
            <p className="flex items-center gap-2">
              {price && <span className="price text-title">{price}</span>}
              <span className="label-caps rounded-full border border-rule-strong px-2 py-0.5">{open.status}</span>
            </p>
            {open.boughtAt && <p className="text-caption text-ink-soft">From {open.boughtAt}</p>}
            {open.notes && <p className="text-caption text-ink-soft">{open.notes}</p>}
            {open.sourceUrl && (
              <a
                href={open.sourceUrl}
                target="_blank"
                rel="noreferrer noopener nofollow"
                className="inline-flex items-center gap-1 pt-1 text-caption font-medium underline underline-offset-4"
              >
                View item <ArrowUpRight aria-hidden className="h-3.5 w-3.5" />
              </a>
            )}
          </div>
        </Dialog>
      )}
    </>
  );
}

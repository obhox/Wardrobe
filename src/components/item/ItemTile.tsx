import { formatMoney } from "@/lib/currency";
import { cx } from "@/lib/cx";
import { Tag } from "@/components/ui/Chip";

// How an item looks, on the board and in the collage. Presentational only (no
// store), so the owner's canvas and the shared guest page draw the same thing.

export interface TileItem {
  name: string;
  status: "owned" | "want";
  /** an image URL the browser can load as it is */
  src: string;
  /** the image is a cutout with a transparent background */
  cut: boolean;
  brand?: string | null;
  price?: number | null;
  currency?: string | null;
}

interface ImageProps {
  eager?: boolean;
  /** needed where the canvas is exported as a picture */
  crossOrigin?: "anonymous";
}

/** An item on the board: its picture on a quiet tile, with its name, brand
 *  and price beneath. Wrap it in a button or link to make it clickable. */
export default function ItemTile({
  item,
  selected,
  meta = true,
  eager,
  crossOrigin,
}: { item: TileItem; selected?: boolean; meta?: boolean } & ImageProps) {
  const price = formatMoney(item.price, item.currency);
  return (
    <span className="group/tile block text-left">
      <span
        className={cx(
          "relative flex aspect-[4/5] items-center justify-center overflow-hidden rounded-card bg-ink/4 transition group-hover/tile:bg-ink/7",
          selected && "ring-2 ring-ink"
        )}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={item.src}
          alt=""
          crossOrigin={crossOrigin}
          loading={eager ? "eager" : "lazy"}
          decoding="async"
          draggable={false}
          className={cx(
            "select-none",
            // cutouts float on the tile; a plain photo fills it
            item.cut
              ? cx("max-h-[84%] max-w-[84%] object-contain", item.status === "want" ? "cutout-shadow-soft" : "cutout-shadow")
              : "h-full w-full object-cover"
          )}
        />
        {item.status === "want" && <Tag className="absolute left-2 top-2">Want</Tag>}
      </span>
      {meta && (
        <span className="mt-2 block px-0.5">
          <span className="cap-first block truncate text-caption font-medium">{item.name}</span>
          {(item.brand || price) && (
            <span className="flex items-baseline justify-between gap-2 text-caption text-ink-soft">
              <span className="cap-first truncate">{item.brand}</span>
              {price && <span className="price shrink-0">{price}</span>}
            </span>
          )}
        </span>
      )}
    </span>
  );
}

/** An item as a free-standing cutout, for the collage. The caller positions
 *  it and supplies the `group relative` wrapper the tag and name tip sit in.
 *  `float` tilts the picture and lets it bob; the tag and name tip stay upright. */
export function ItemFigure({
  item,
  size,
  float,
  tip = true,
  eager,
  crossOrigin,
}: { item: TileItem; size: number | string; float?: React.CSSProperties; tip?: boolean } & ImageProps) {
  const picture = (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={item.src}
      alt={item.name}
      crossOrigin={crossOrigin}
      loading={eager ? "eager" : "lazy"}
      decoding="async"
      draggable={false}
      className={cx(
        "select-none object-contain",
        item.status === "want" ? "cutout-shadow-soft" : "cutout-shadow",
        // a photo that was never cut out sits on a soft chip (brief §15 fallback)
        !item.cut && "rounded-card bg-panel/60 p-1.5"
      )}
      style={{ width: size, height: size }}
    />
  );
  return (
    <>
      {float ? (
        <span className="floaty block h-full w-full" style={float}>
          {picture}
        </span>
      ) : (
        picture
      )}
      {item.status === "want" && <Tag className="absolute -right-1 -top-1 shadow-control">Want</Tag>}
      {tip && (
        <span className="cap-first pointer-events-none absolute left-1/2 top-full z-10 mt-1 -translate-x-1/2 whitespace-nowrap rounded-md bg-ink px-2 py-0.5 text-caption text-ground opacity-0 transition group-hover:opacity-100 group-focus-visible:opacity-100">
          {item.name}
        </span>
      )}
    </>
  );
}

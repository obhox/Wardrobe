import { proxiedSrc } from "@/lib/img";
import type { Item } from "@/lib/types";
import type { TileItem } from "./ItemTile";

/** What ItemTile needs from one of the signed-in owner's items. */
export function toTile(it: Item): TileItem {
  return {
    name: it.name,
    status: it.status,
    src: proxiedSrc(it.cutoutUrl || it.imageUrl),
    cut: !!it.cutoutUrl,
    brand: it.brand,
    price: it.price,
    currency: it.currency,
  };
}

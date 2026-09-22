import type { StickerKind } from "@/lib/types";
import { STICKER_GLYPH } from "@/lib/stickers";

// Renders a sticker's face. Washi tape and tape corners are little striped
// strips; everything else is a glyph.
export default function StickerArt({ kind }: { kind: StickerKind }) {
  if (kind === "washi" || kind === "corner") {
    return (
      <span
        aria-hidden
        className="washi block"
        style={kind === "corner" ? { width: 64, height: 22 } : { width: 110, height: 24 }}
      />
    );
  }
  return (
    <span aria-hidden className="block whitespace-nowrap text-[22px] leading-none text-ink-soft">
      {STICKER_GLYPH[kind]}
    </span>
  );
}

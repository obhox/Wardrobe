import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { PATTERN_CLASS, TIER_SIZE } from "@/lib/theme";
import { groundAttr, groundVars } from "@/lib/ground";
import { computeLayout } from "@/lib/layout";
import { sign } from "@/lib/auth/crypto";
import { isOwnImage, toItem } from "@/lib/wardrobe";
import GuestCutout, { type GuestItem } from "@/components/canvas/GuestCutout";
import StickerArt from "@/components/canvas/StickerArt";
import type { SizeTier, Pattern, Ground, LayoutMode, SortKey, Section, StickerKind } from "@/lib/types";

export const dynamic = "force-dynamic";

// never index someone's closet, even if a link leaks
export const metadata: Metadata = {
  title: "a wardrobe · read-only",
  robots: { index: false, follow: false, nocache: true },
  referrer: "no-referrer",
};

// guests have no session, so third-party photos get a signed proxy link
function guestSrc(url: string) {
  return isOwnImage(url) ? url : `/api/img?url=${encodeURIComponent(url)}&sig=${sign(url)}`;
}

// Read-only guest view (brief §7 / §25.4). Visible only when the owner turned
// sharing on; they also choose whether details show and which sections.
export default async function GuestView({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const wardrobe = await prisma.wardrobe.findUnique({
    where: { shareCode: code },
    include: {
      items: { orderBy: { createdAt: "asc" } },
      sections: { orderBy: { order: "asc" } },
      stickers: true,
      owner: { select: { handle: true } },
    },
  });

  if (!wardrobe || wardrobe.visibility !== "unlisted") {
    return (
      <main className="ground-field flex min-h-dvh flex-col items-center justify-center gap-3 p-6 text-center">
        <pre aria-hidden className="text-ink-soft">{"¯\\_(ツ)_/¯"}</pre>
        <p className="text-sm lowercase text-ink-soft">this wardrobe is private — or the link has changed.</p>
        <Link href="/" className="text-xs lowercase underline underline-offset-4">
          make your own →
        </Link>
      </main>
    );
  }

  const ground = wardrobe.ground as Ground;
  const pattern = (PATTERN_CLASS[wardrobe.pattern as Pattern] !== undefined ? wardrobe.pattern : "none") as Pattern;
  const details = wardrobe.shareDetails;
  const mode = wardrobe.layoutMode as LayoutMode;
  const gallery = mode === "gallery";

  const shared = new Set(wardrobe.sections.filter((s) => s.shared).map((s) => s.id));
  const visible = wardrobe.items.filter((it) => !it.sectionId || shared.has(it.sectionId));
  const sections: Section[] = wardrobe.sections.filter((s) => shared.has(s.id)).map((s) => ({ id: s.id, name: s.name, order: s.order }));

  const placements = computeLayout(visible.map(toItem), sections, mode, wardrobe.sortKey as SortKey);
  const at = new Map((placements ?? []).map((p) => [p.id, p]));

  // detail fields are omitted entirely unless the owner opted in
  const guestItems: GuestItem[] = visible.map((it) => {
    const p = at.get(it.id);
    return {
      id: it.id,
      src: guestSrc(it.cutoutUrl || it.imageUrl),
      cut: !!it.cutoutUrl,
      name: it.name,
      status: it.status as "owned" | "want",
      size: TIER_SIZE[(it.sizeTier as SizeTier) ?? "medium"],
      posX: p?.posX ?? it.posX,
      posY: p?.posY ?? it.posY,
      rotation: p?.rotation ?? it.rotation,
      ...(details
        ? {
            brand: it.brand,
            price: it.price,
            currency: it.currency,
            boughtAt: it.boughtAt,
            notes: it.notes,
            sourceUrl: it.sourceUrl,
          }
        : {}),
    };
  });

  return (
    <main
      className={"ground-field relative min-h-dvh " + (gallery ? "" : "overflow-hidden")}
      data-ground={groundAttr(ground)}
      data-accent={wardrobe.accent}
      style={groundVars(ground) ?? undefined}
    >
      {pattern !== "none" && <div className={`pointer-events-none absolute inset-0 ${PATTERN_CLASS[pattern]}`} />}
      <header className="absolute left-5 right-5 top-5 z-10 sm:left-6 sm:top-6">
        <h1 className="truncate font-[family-name:var(--font-display)] text-lg lowercase sm:text-xl">
          {wardrobe.icon ?? "✦"} {wardrobe.title}
        </h1>
        {wardrobe.tagline && <p className="text-xs lowercase text-ink-soft">{wardrobe.tagline}</p>}
      </header>

      {!gallery &&
        wardrobe.stickers.map((s) => (
          <div
            key={s.id}
            aria-hidden
            className="pointer-events-none absolute"
            style={{
              left: `${s.posX * 100}%`,
              top: `${s.posY * 100}%`,
              transform: `translate(-50%,-50%) rotate(${s.rotation}deg) scale(${s.scale})`,
            }}
          >
            <StickerArt kind={s.kind as StickerKind} />
          </div>
        ))}

      {guestItems.length === 0 ? (
        <p className="flex h-dvh items-center justify-center text-sm lowercase text-ink-soft">nothing shared here yet.</p>
      ) : gallery ? (
        <ul className="relative grid grid-cols-[repeat(auto-fill,minmax(116px,1fr))] gap-3 px-5 pb-28 pt-24 sm:gap-4 sm:px-7 md:grid-cols-[repeat(auto-fill,minmax(150px,1fr))]">
          {guestItems.map((it) => (
            <li key={it.id}>
              <GuestCutout item={it} details={details} gallery />
            </li>
          ))}
        </ul>
      ) : (
        <div className="relative h-dvh w-full">
          {guestItems.map((it) => (
            <GuestCutout key={it.id} item={it} details={details} />
          ))}
        </div>
      )}

      <footer className="fixed inset-x-3 bottom-[max(1rem,env(safe-area-inset-bottom))] z-10 text-center text-[11px] lowercase text-ink-soft sm:text-xs">
        a read-only peek · ✦ {wardrobe.owner.handle} ·{" "}
        <Link href="/" className="underline underline-offset-4">make your own</Link>
      </footer>
    </main>
  );
}

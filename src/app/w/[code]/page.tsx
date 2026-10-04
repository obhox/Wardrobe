import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { TIER_SIZE, toThemeId } from "@/lib/theme";
import { sortItems, toLayoutMode } from "@/lib/layout";
import { sign } from "@/lib/auth/crypto";
import { isOwnImage, toItem } from "@/lib/wardrobe";
import GuestItems, { type GuestItem } from "@/components/item/GuestItems";
import type { SortKey, Section } from "@/lib/types";

export const dynamic = "force-dynamic";

// never index someone's closet, even if a link leaks
export const metadata: Metadata = {
  title: "A wardrobe · read-only",
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
      owner: { select: { handle: true } },
    },
  });

  if (!wardrobe || wardrobe.visibility !== "unlisted") {
    return (
      <main className="flex min-h-dvh flex-col items-center justify-center gap-3 p-6 text-center">
        <h1 className="font-display text-heading">This wardrobe is private</h1>
        <p className="text-ink-soft">Or the link to it has changed.</p>
        <Link href="/" className="text-caption font-medium underline underline-offset-4">
          Make your own
        </Link>
      </main>
    );
  }

  const details = wardrobe.shareDetails;
  // like the owner's view: the collage shows from tablet width up, and phones
  // always get the scrolling board
  const collage = toLayoutMode(wardrobe.layoutMode) === "free";

  const shared = new Set(wardrobe.sections.filter((s) => s.shared).map((s) => s.id));
  const sections: Section[] = wardrobe.sections.filter((s) => shared.has(s.id)).map((s) => ({ id: s.id, name: s.name, order: s.order }));
  const visible = sortItems(
    wardrobe.items.filter((it) => !it.sectionId || shared.has(it.sectionId)).map(toItem),
    wardrobe.sortKey as SortKey,
    sections
  );

  // detail fields are omitted entirely unless the owner opted in
  const guestItems: GuestItem[] = visible.map((it) => ({
    id: it.id,
    src: guestSrc(it.cutoutUrl || it.imageUrl),
    cut: !!it.cutoutUrl,
    name: it.name,
    status: it.status,
    size: TIER_SIZE[it.sizeTier] ?? TIER_SIZE.medium,
    posX: it.posX,
    posY: it.posY,
    rotation: it.rotation,
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
  }));

  return (
    <main
      className={"ground-field relative min-h-dvh " + (collage ? "md:h-dvh md:overflow-hidden" : "")}
      data-theme={toThemeId(wardrobe.theme)}
    >
      <header className="absolute left-4 right-4 top-6 z-10 sm:left-6 md:left-8">
        <h1 className="cap-first truncate font-display text-heading">{wardrobe.title}</h1>
        {wardrobe.tagline && <p className="cap-first text-caption text-ink-soft">{wardrobe.tagline}</p>}
      </header>

      {guestItems.length === 0 ? (
        <p className="flex h-dvh items-center justify-center text-ink-soft">Nothing shared here yet.</p>
      ) : (
        <GuestItems items={guestItems} details={details} collage={collage} />
      )}

      <footer className="fixed inset-x-3 bottom-[max(1rem,env(safe-area-inset-bottom))] z-10 text-center text-caption text-ink-soft">
        A read-only look at {wardrobe.owner.handle}&apos;s wardrobe ·{" "}
        <Link href="/" className="font-medium underline underline-offset-4">
          Make your own
        </Link>
      </footer>
    </main>
  );
}

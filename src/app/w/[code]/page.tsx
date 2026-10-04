import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { TIER_SIZE, toThemeId } from "@/lib/theme";
import { sortItems, toLayoutMode } from "@/lib/layout";
import { sign } from "@/lib/auth/crypto";
import { isOwnImage, toItem } from "@/lib/wardrobe";
import GuestCutout, { type GuestItem } from "@/components/canvas/GuestCutout";
import type { SortKey, Section } from "@/lib/types";

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

  const theme = toThemeId(wardrobe.theme);
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
      data-theme={theme}
    >
      <header className="absolute left-5 right-5 top-5 z-10 sm:left-6 sm:top-6">
        <h1 className="truncate font-[family-name:var(--font-display)] text-lg lowercase sm:text-xl">
          {wardrobe.icon ?? "✦"} {wardrobe.title}
        </h1>
        {wardrobe.tagline && <p className="text-xs lowercase text-ink-soft">{wardrobe.tagline}</p>}
      </header>

      {guestItems.length === 0 ? (
        <p className="flex h-dvh items-center justify-center text-sm lowercase text-ink-soft">nothing shared here yet.</p>
      ) : (
        <>
          <ul
            className={
              "relative grid grid-cols-[repeat(auto-fill,minmax(116px,1fr))] gap-3 px-5 pb-28 pt-24 sm:gap-4 sm:px-7 md:grid-cols-[repeat(auto-fill,minmax(150px,1fr))] " +
              (collage ? "md:hidden" : "")
            }
          >
            {guestItems.map((it) => (
              <li key={it.id}>
                <GuestCutout item={it} details={details} theme={theme} gallery />
              </li>
            ))}
          </ul>
          {collage && (
            <div className="relative hidden h-dvh w-full md:block">
              {guestItems.map((it) => (
                <GuestCutout key={it.id} item={it} details={details} theme={theme} />
              ))}
            </div>
          )}
        </>
      )}

      <footer className="fixed inset-x-3 bottom-[max(1rem,env(safe-area-inset-bottom))] z-10 text-center text-[11px] lowercase text-ink-soft sm:text-xs">
        a read-only peek · ✦ {wardrobe.owner.handle} ·{" "}
        <Link href="/" className="underline underline-offset-4">make your own</Link>
      </footer>
    </main>
  );
}

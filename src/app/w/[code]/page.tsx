import Link from "next/link";
import { prisma } from "@/lib/db";
import { PATTERN_CLASS } from "@/lib/theme";
import { TIER_SIZE } from "@/lib/theme";
import GuestCutout, { type GuestItem } from "@/components/canvas/GuestCutout";
import type { SizeTier, Pattern, Ground } from "@/lib/types";

export const dynamic = "force-dynamic";

// Optional read-only guest view (brief §7 / §25 decision 4).
// Sharing is off by default; a wardrobe is only visible here if its owner has
// set visibility to "unlisted" and it has a shareCode. The owner additionally
// controls (a) whether item details are exposed and (b) which sections show.
export default async function GuestView({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  const wardrobe = await prisma.wardrobe.findUnique({
    where: { shareCode: code },
    include: {
      items: true,
      sections: { select: { id: true, shared: true } },
      owner: { select: { handle: true } },
    },
  });

  if (!wardrobe || wardrobe.visibility !== "unlisted") {
    return (
      <main className="ground-field flex min-h-dvh flex-col items-center justify-center gap-3 p-6 text-center">
        <pre className="font-[family-name:var(--font-display)] lowercase">✦</pre>
        <p className="text-sm lowercase text-ink-soft">this wardrobe is private.</p>
        <Link href="/" className="text-xs lowercase underline underline-offset-4">
          make your own →
        </Link>
      </main>
    );
  }

  const ground = wardrobe.ground as Ground;
  const pattern = wardrobe.pattern as Pattern;
  const details = wardrobe.shareDetails;
  const gallery = wardrobe.layoutMode === "gallery";

  // only show items in shared sections; unsorted items stay visible
  const sharedSectionIds = new Set(
    wardrobe.sections.filter((s) => s.shared).map((s) => s.id)
  );
  const visible = wardrobe.items.filter(
    (it) => !it.sectionId || sharedSectionIds.has(it.sectionId)
  );

  // shape items for the client; detail fields are omitted entirely when the
  // owner hasn't opted in, so private data never reaches the browser.
  const guestItems: GuestItem[] = visible.map((it) => ({
    id: it.id,
    src: it.cutoutUrl || it.imageUrl,
    name: it.name,
    status: it.status as "owned" | "want",
    size: TIER_SIZE[(it.sizeTier as SizeTier) ?? "medium"],
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
      className={
        "ground-field relative min-h-dvh " + (gallery ? "" : "overflow-hidden")
      }
      data-ground={ground}
    >
      {pattern !== "none" && (
        <div className={`pointer-events-none absolute inset-0 ${PATTERN_CLASS[pattern]}`} />
      )}
      <header className="absolute left-6 top-6 z-10">
        <div className="font-[family-name:var(--font-display)] text-xl lowercase">
          ✦ {wardrobe.title}
        </div>
        <div className="text-xs lowercase text-ink-soft">{wardrobe.tagline}</div>
      </header>

      {gallery ? (
        <div className="relative grid grid-cols-[repeat(auto-fill,minmax(116px,1fr))] gap-3 px-5 pb-28 pt-24 sm:gap-4 sm:px-7 md:grid-cols-[repeat(auto-fill,minmax(140px,1fr))]">
          {guestItems.map((it) => (
            <GuestCutout key={it.id} item={it} details={details} gallery />
          ))}
        </div>
      ) : (
        <div className="relative h-dvh w-full">
          {guestItems.map((it) => (
            <GuestCutout key={it.id} item={it} details={details} />
          ))}
        </div>
      )}

      <footer className="fixed bottom-4 left-1/2 z-10 -translate-x-1/2 text-xs lowercase text-ink-soft">
        a read-only peek · {wardrobe.owner.handle}
      </footer>
    </main>
  );
}

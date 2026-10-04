import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { brand } from "@/lib/brand";
import { getCurrentUser } from "@/lib/auth/session";
import { listWardrobes } from "@/lib/wardrobe";
import AccountSettings from "@/components/you/AccountSettings";
import WardrobesManager from "@/components/you/WardrobesManager";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: `You · ${brand.name}`,
  robots: { index: false, follow: false },
};

// Everything that belongs to the person rather than to one wardrobe.
export default async function YouPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/");
  const wardrobes = await listWardrobes(user.id);

  return (
    <main className="mx-auto w-full max-w-2xl px-4 pb-16 pt-8 sm:px-6 sm:pt-12">
      <h1 className="font-display text-display">You</h1>
      <p className="mt-1 font-mono text-caption text-ink-soft">@{user.handle}</p>

      <section className="mt-10" aria-labelledby="you-wardrobes">
        <h2 id="you-wardrobes" className="font-display text-heading">
          Wardrobes
        </h2>
        <p className="mb-5 mt-1 text-ink-soft">Each has its own theme, sections and share link.</p>
        <WardrobesManager wardrobes={wardrobes} currentId={user.lastWardrobeId} />
      </section>

      <section className="mt-14" aria-labelledby="you-account">
        <h2 id="you-account" className="mb-5 font-display text-heading">
          Account
        </h2>
        <AccountSettings handle={user.handle} displayCurrency={user.displayCurrency} />
      </section>
    </main>
  );
}

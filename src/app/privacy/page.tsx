import type { Metadata } from "next";
import Link from "next/link";
import { brand } from "@/lib/brand";

export const metadata: Metadata = {
  title: `Privacy · ${brand.name}`,
  description: `What ${brand.name} and its browser extension do with your data.`,
};

// Linked from the Chrome Web Store listing — keep it in step with
// extension/STORE.md and what the app and the extension actually do.
export default function Privacy() {
  return (
    <main className="min-h-dvh px-4 py-12 sm:px-6 sm:py-16">
      <article className="mx-auto max-w-2xl">
        <Link href="/" className="font-display text-title">
          {brand.wordmark}
        </Link>
        <h1 className="mt-10 font-display text-display">Privacy</h1>
        <p className="mt-2 text-caption text-ink-faint">Last updated 4 October 2026</p>

        <div className="mt-8 space-y-4 text-ink-soft [&_b]:font-medium [&_b]:text-ink [&_code]:font-mono [&_code]:text-caption [&_li]:pl-1 [&_ul]:list-disc [&_ul]:space-y-2 [&_ul]:pl-5">
          <H>The short version</H>
          <p>
            {brand.name} is a personal closet. What you add is yours: it isn&apos;t sold, shared with advertisers, or used
            to show you ads. A wardrobe is private unless you turn on sharing for it.
          </p>

          <H>What the website stores</H>
          <ul>
            <li>Your account: a public handle, a hashed sign-in combination or your email, and passkeys if you add them.</li>
            <li>
              Your wardrobes: the items, photos, links, prices, notes, sections and themes you add. Photos are stored as
              images in our storage bucket at unguessable addresses.
            </li>
            <li>
              For items you want that have a product link: the price we read from that page about once a day, so we can
              tell you when it drops. You can turn this off for any item.
            </li>
            <li>
              A sign-in cookie (<code>wardrobe_session</code>) so you stay signed in, and the device type of each
              signed-in session, so you can sign devices out.
            </li>
            <li>Basic usage analytics (pages visited, and events such as &quot;item added&quot;) to see what is working.</li>
          </ul>

          <H>Sharing</H>
          <p>
            If you turn on sharing for a wardrobe, anyone with its link can look at it but not change it. You choose
            which sections it includes and whether names, brands and prices show. Turning sharing off, or making a new
            link, stops the old link working. Shared pages ask search engines not to index them.
          </p>

          <H>Background removal</H>
          <p>
            Cutting the background out of a photo happens in your browser. The photo isn&apos;t sent to any third party
            for this: your browser downloads the cutout model once (from imgly&apos;s public CDN) and runs it locally.
          </p>

          <H>The browser extension</H>
          <p>The Chrome extension only does something when you ask it to:</p>
          <ul>
            <li>
              When you click its button, use its shortcut, or pick it from the right-click menu, it reads the page in
              that one tab (the product name, brand, price and photos) to fill in the form.
            </li>
            <li>
              Nothing is sent anywhere until you press <b>Add</b>. Then the item you confirmed (name, brand, price, photo
              link, the page&apos;s link, and anything you typed) is saved to your wardrobe at {brand.host}.
            </li>
            <li>Photo previews, and the colour used to sort by colour, are loaded through {brand.host}&apos;s image proxy.</li>
            <li>It uses your existing sign-in. It never sees or stores your combination or passkey.</li>
            <li>
              It keeps a few small preferences in your browser (last currency and section, and an unsaved draft for the
              tab you were on). These never leave your browser.
            </li>
            <li>It does not track your browsing, read pages you didn&apos;t ask it to, run analytics, or load remote code.</li>
          </ul>

          <H>Deleting your data</H>
          <p>
            Delete any item and it is gone, photos included. Removing the extension deletes its local preferences. From{" "}
            <b>Account</b> you can download everything we hold as a file, or delete your whole account: every wardrobe,
            item and photo, for good.
          </p>
        </div>

        <p className="mt-12">
          <Link href="/" className="text-caption font-medium underline underline-offset-4">
            Back to {brand.name}
          </Link>
        </p>
      </article>
    </main>
  );
}

function H({ children }: { children: React.ReactNode }) {
  return <h2 className="!mt-10 font-display text-heading text-ink">{children}</h2>;
}

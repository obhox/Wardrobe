import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "privacy · wardrobe",
  description: "what wardrobe and the wardrobe browser extension do with your data.",
};

// Linked from the Chrome Web Store listing — keep it in step with
// extension/STORE.md and what the extension actually does.
export default function Privacy() {
  return (
    <main className="ground-field min-h-dvh px-6 py-16">
      <article className="mx-auto max-w-2xl rounded-2xl border border-rule bg-panel p-8 text-sm leading-relaxed lowercase text-ink-soft shadow-[0_24px_60px_var(--shadow)]">
        <h1 className="font-[family-name:var(--font-display)] text-2xl text-ink">privacy</h1>
        <p className="mt-2 text-xs">last updated 22 september 2026</p>

        <H>the short version</H>
        <p>
          wardrobe is a personal closet. what you add is yours: it isn&apos;t sold, shared with
          advertisers, or used to show you ads. there is no store and no affiliate links.
        </p>

        <H>what the website stores</H>
        <ul className="list-disc space-y-1 pl-5">
          <li>your account: a public handle, a hashed sign-in combination or your email, and passkeys if you add them.</li>
          <li>your wardrobes: the items, photos, links, prices, notes, sections and decorations you add. photos are stored as images in our storage bucket at unguessable addresses.</li>
          <li>for want items with a link: the price we read from that page every few hours, so we can tell you when it drops. turn this off per item.</li>
          <li>a sign-in cookie (<code>wardrobe_session</code>) so you stay signed in, and the device type of each signed-in session (so you can sign devices out).</li>
          <li>basic usage analytics (pages visited, and events like &quot;item added&quot;) to see what&apos;s working.</li>
        </ul>

        <H>background removal</H>
        <p>
          cutting the background out of a photo happens in your browser. the photo isn&apos;t sent to
          any third party for this — your browser downloads the cutout model once (from imgly&apos;s
          public cdn) and runs it locally.
        </p>

        <H>the browser extension</H>
        <p>the &quot;wardrobe — save to closet&quot; chrome extension only does something when you ask it to:</p>
        <ul className="mt-2 list-disc space-y-1 pl-5">
          <li>
            when you click its button, use its shortcut, or pick it from the right-click menu, it reads
            the page in that one tab — the product name, brand, price and photos — to fill in the form.
          </li>
          <li>
            nothing is sent anywhere until you press <b>add ✦</b>. then the item you confirmed (name,
            brand, price, photo link, the page&apos;s link, and anything you typed) is saved to your
            wardrobe at wardrobe.obhox.com.
          </li>
          <li>
            photo previews and the colour used for &quot;arrange by color&quot; are loaded through
            wardrobe.obhox.com&apos;s image proxy.
          </li>
          <li>
            it uses your existing wardrobe sign-in; it never sees or stores your combination or passkey.
          </li>
          <li>
            it keeps a few small preferences in your browser (last currency and section, and an
            unsaved draft for the tab you were on). these never leave your browser.
          </li>
          <li>
            it does not track your browsing, read pages you didn&apos;t ask it to, run analytics, or load
            remote code.
          </li>
        </ul>

        <H>deleting your data</H>
        <p>
          delete any item from the studio and it&apos;s gone, photos included. removing the extension
          deletes its local preferences. from <b>account</b> in the studio you can download everything
          we hold as a file, or delete your whole account — every wardrobe, item and photo — for good.
        </p>

        <p className="mt-10">
          <Link href="/" className="text-ink underline underline-offset-2">
            ← back to wardrobe
          </Link>
        </p>
      </article>
    </main>
  );
}

function H({ children }: { children: React.ReactNode }) {
  return <h2 className="mb-2 mt-8 font-[family-name:var(--font-display)] text-base text-ink">{children}</h2>;
}

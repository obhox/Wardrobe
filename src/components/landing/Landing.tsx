"use client";

import { useRef } from "react";
import { motion, useReducedMotion } from "framer-motion";
import CombinationLock from "@/components/auth/CombinationLock";
import { brand } from "@/lib/brand";
import { THEMES } from "@/lib/theme";
import { Button, buttonClass } from "@/components/ui/Button";
import ItemTile, { type TileItem } from "@/components/item/ItemTile";

/* ------------------------------------------------------------------ *
 *  Landing page
 *  The product in one screen: what it is, a board drawn with the real
 *  item tile (so it never goes stale like a screenshot), how it works,
 *  and the sign-in card at the foot.
 * ------------------------------------------------------------------ */

const fadeUp = {
  initial: { opacity: 0, y: 20 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-80px" },
  transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] as const },
};

const SAMPLES: TileItem[] = [
  { name: "Trench coat", brand: "Owned", price: 240, currency: "USD", status: "owned", src: "/cutouts/coat.png", cut: true },
  { name: "Evening dress", brand: "Target $160", price: 185, currency: "USD", status: "want", src: "/cutouts/dress.png", cut: true },
  { name: "Trail shoes", brand: "Owned", price: 130, currency: "USD", status: "owned", src: "/cutouts/shoe.png", cut: true },
  { name: "Harrington jacket", brand: "Owned", price: 95, currency: "USD", status: "owned", src: "/cutouts/jacket.png", cut: true },
  { name: "Dress watch", brand: "Target $400", price: 480, currency: "USD", status: "want", src: "/cutouts/watch.png", cut: true },
  { name: "Sunglasses", brand: "Owned", price: 60, currency: "USD", status: "owned", src: "/cutouts/sunglasses.png", cut: true },
];

const STEPS = [
  { title: "Add an item", body: "Paste a product link and the photo, name and price are filled in. Or upload a photo of your own." },
  { title: "The background drops away", body: "The cutout is made in your browser. Nothing is sent to a third party to do it." },
  { title: "Organise", body: "File pieces into sections you name. See them as a board that scrolls, or a collage you place by hand." },
  { title: "Make it yours", body: "Pick a theme and a title, and share a read-only link when you want to show it off." },
];

const FEATURES = [
  { tag: "Owned and wanted", title: "One place for both", body: "Keep what you have beside what you're after. Wanted pieces carry a small tag, so the two never blur." },
  { tag: "Sections", title: "A directory that counts", body: "Name your own sections. They list with live counts and double as a plain-text view of everything." },
  { tag: "Arrange", title: "Board or collage", body: "A board that scrolls on any screen, or a free collage on larger ones. Sort by newest, colour, section or name." },
  { tag: "Prices", title: "Know when it drops", body: "Add a product link to something you want and its price is checked daily. You hear when it falls or reaches your target." },
  { tag: "Wardrobes", title: "More than one room", body: "A closet, a wishlist, a gear shelf: each with its own theme, sections and share link." },
  { tag: "Stats", title: "What it adds up to", body: "Totals by section and brand in your own currency, and what your wishlist would cost today." },
];

export default function Landing() {
  const reduce = useReducedMotion();
  const enterRef = useRef<HTMLDivElement>(null);

  const scrollToEnter = () =>
    enterRef.current?.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "center" });

  return (
    <main className="min-h-dvh w-full overflow-x-clip">
      <header className="sticky top-0 z-30 border-b border-rule bg-ground/85 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:px-6">
          <span className="font-display text-title">{brand.wordmark}</span>
          <nav className="flex items-center gap-5 text-caption text-ink-soft">
            <a href="#how" className="hidden transition hover:text-ink sm:inline">
              How it works
            </a>
            <a href="#features" className="hidden transition hover:text-ink sm:inline">
              Features
            </a>
            <Button variant="primary" size="sm" onClick={scrollToEnter}>
              Sign in
            </Button>
          </nav>
        </div>
      </header>

      <section className="mx-auto flex max-w-6xl flex-col items-center px-4 pb-16 pt-14 text-center sm:px-6 sm:pb-24 sm:pt-20">
        <motion.p {...fadeUp} className="label-caps text-ink-soft">
          A home for your wardrobe
        </motion.p>
        <motion.h1 {...fadeUp} transition={{ ...fadeUp.transition, delay: 0.05 }} className="mt-5 max-w-3xl text-balance font-display text-hero">
          Everything you own, beautifully arranged.
        </motion.h1>
        <motion.p
          {...fadeUp}
          transition={{ ...fadeUp.transition, delay: 0.1 }}
          className="mt-6 max-w-xl text-balance text-title text-ink-soft"
        >
          Add what you have and what you want, from a link or a photo. Each piece is cut out and placed on a canvas you
          arrange, sort and share.
        </motion.p>
        <motion.div {...fadeUp} transition={{ ...fadeUp.transition, delay: 0.15 }} className="mt-9 flex flex-col items-center gap-3 sm:flex-row">
          <Button variant="primary" size="lg" onClick={scrollToEnter}>
            Open your wardrobe
          </Button>
          <a href="#how" className={buttonClass("secondary", "lg")}>
            See how it works
          </a>
        </motion.div>
        <motion.p {...fadeUp} transition={{ ...fadeUp.transition, delay: 0.2 }} className="mt-5 text-caption text-ink-faint">
          Private until you share it. No ads.
        </motion.p>

        {/* a board drawn with the app's own item tile */}
        <motion.div
          initial={reduce ? false : { opacity: 0, y: 32 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.25, ease: [0.22, 1, 0.36, 1] }}
          className="mt-14 w-full max-w-3xl sm:mt-16"
        >
          <div data-theme="bone" className="ground-field rounded-sheet border border-rule p-4 text-left shadow-overlay sm:p-6">
            <div className="mb-4 flex items-baseline gap-2 sm:mb-5">
              <span className="font-display text-title">Everything</span>
              <span className="label-caps text-ink-faint">{SAMPLES.length} items</span>
            </div>
            <ul className="grid grid-cols-2 gap-x-4 gap-y-5 sm:grid-cols-3 sm:gap-x-5 sm:gap-y-6" aria-label="An example wardrobe">
              {SAMPLES.map((item) => (
                <li key={item.name}>
                  <ItemTile item={item} eager />
                </li>
              ))}
            </ul>
          </div>
        </motion.div>
      </section>

      <section id="how" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-16 sm:px-6 sm:py-20">
        <SectionLabel kicker="How it works" title="Four steps to a wardrobe you enjoy opening." />
        <ol className="mt-10 grid gap-x-8 gap-y-10 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((s, i) => (
            <motion.li key={s.title} {...fadeUp} transition={{ ...fadeUp.transition, delay: i * 0.06 }} className="border-t border-rule-strong pt-4">
              <span className="label-caps text-ink-faint">{String(i + 1).padStart(2, "0")}</span>
              <h3 className="mt-2 font-display text-title">{s.title}</h3>
              <p className="mt-2 text-ink-soft">{s.body}</p>
            </motion.li>
          ))}
        </ol>
      </section>

      <section id="features" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-16 sm:px-6 sm:py-20">
        <SectionLabel kicker="Features" title="Quiet everywhere, except the things themselves." />
        <div className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f, i) => (
            <motion.div
              key={f.title}
              {...fadeUp}
              transition={{ ...fadeUp.transition, delay: (i % 3) * 0.06 }}
              className="rounded-card border border-rule bg-panel p-6"
            >
              <span className="label-caps text-ink-faint">{f.tag}</span>
              <h3 className="mt-2 font-display text-title">{f.title}</h3>
              <p className="mt-2 text-ink-soft">{f.body}</p>
            </motion.div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
        <SectionLabel kicker="Themes" title="Seven grounds. Your things supply the colour." />
        <motion.ul {...fadeUp} className="mt-10 flex flex-wrap gap-5">
          {THEMES.map((t) => (
            <li key={t.id} className="flex flex-col items-center gap-2">
              <div className="h-20 w-20 rounded-card border border-rule shadow-control" style={{ background: t.swatch }} />
              <span className="label-caps text-ink-soft">{t.label}</span>
            </li>
          ))}
        </motion.ul>
      </section>

      <section ref={enterRef} className="mx-auto max-w-6xl scroll-mt-24 px-4 py-20 sm:px-6">
        <motion.div {...fadeUp} className="flex flex-col items-center">
          <h2 className="text-center font-display text-display">Ready when you are</h2>
          <p className="mb-9 mt-2 max-w-md text-center text-ink-soft">Sign in, or create a wardrobe in under a minute.</p>
          <CombinationLock />
        </motion.div>
      </section>

      <footer className="border-t border-rule">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-4 py-8 text-caption text-ink-soft sm:flex-row sm:px-6">
          <span className="font-display text-body text-ink">{brand.wordmark}</span>
          <span>{brand.tagline}</span>
          <a href="/privacy" className="underline underline-offset-4 transition hover:text-ink">
            Privacy
          </a>
        </div>
      </footer>
    </main>
  );
}

function SectionLabel({ kicker, title }: { kicker: string; title: string }) {
  return (
    <motion.div {...fadeUp} className="max-w-2xl">
      <span className="label-caps text-ink-soft">{kicker}</span>
      <h2 className="mt-3 text-balance font-display text-display">{title}</h2>
    </motion.div>
  );
}

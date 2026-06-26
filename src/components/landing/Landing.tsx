"use client";

import { useRef } from "react";
import { motion, useReducedMotion } from "framer-motion";
import CombinationLock from "@/components/auth/CombinationLock";

/* ------------------------------------------------------------------ *
 *  wardrobe — landing page
 *  Calm ground, monospace, cutouts drifting in negative space.
 *  Three words to design by: cutout · calm · curiosity. (brief §3)
 *  The CombinationLock (login / create / recover) is kept intact,
 *  embedded as the "enter" panel at the foot of the page.
 * ------------------------------------------------------------------ */

/** floating cutouts — real background-removed product PNGs.
 *  mixed size tiers + random rotation −13°…+13° (brief §15) */
const CUTOUTS = [
  { src: "/cutouts/dress.png", alt: "dress", top: "10%", left: "6%", size: 150, rot: -9, dur: 7, delay: 0 },
  { src: "/cutouts/jacket.png", alt: "jacket", top: "18%", left: "80%", size: 168, rot: 8, dur: 8.4, delay: 0.6 },
  { src: "/cutouts/shoe.png", alt: "sneaker", top: "64%", left: "9%", size: 140, rot: -12, dur: 6.5, delay: 1.1 },
  { src: "/cutouts/coat.png", alt: "coat", top: "66%", left: "78%", size: 156, rot: 7, dur: 9, delay: 0.3 },
  { src: "/cutouts/hat.png", alt: "hat", top: "40%", left: "90%", size: 120, rot: -6, dur: 7.5, delay: 1.4 },
  { src: "/cutouts/sunglasses.png", alt: "sunglasses", top: "84%", left: "46%", size: 104, rot: 10, dur: 6.8, delay: 0.9 },
  { src: "/cutouts/watch.png", alt: "watch", top: "8%", left: "58%", size: 92, rot: -4, dur: 8.2, delay: 0.2 },
  { src: "/cutouts/scarf.png", alt: "scarf", top: "50%", left: "2%", size: 110, rot: 11, dur: 7.2, delay: 1.7 },
];

const fadeUp = {
  initial: { opacity: 0, y: 24 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-80px" },
  transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] as const },
};

export default function Landing() {
  const reduce = useReducedMotion();
  const enterRef = useRef<HTMLDivElement>(null);

  const scrollToEnter = () =>
    enterRef.current?.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "center" });

  return (
    <main className="ground-field min-h-dvh w-full overflow-x-hidden text-ink">
      {/* ── top bar ─────────────────────────────────────────── */}
      <header className="sticky top-0 z-30 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <span className="font-[family-name:var(--font-display)] text-xl lowercase tracking-tight">
            ✦ wardrobe
          </span>
          <nav className="flex items-center gap-5 text-sm lowercase text-ink-soft">
            <a href="#how" className="hidden transition hover:text-ink sm:inline">
              how it works
            </a>
            <a href="#features" className="hidden transition hover:text-ink sm:inline">
              features
            </a>
            <button
              onClick={scrollToEnter}
              className="rounded-full bg-ink px-4 py-1.5 text-panel transition hover:opacity-90"
            >
              enter ✦
            </button>
          </nav>
        </div>
      </header>

      {/* ── hero ────────────────────────────────────────────── */}
      <section className="relative isolate mx-auto flex max-w-6xl flex-col items-center px-6 pb-28 pt-20 text-center sm:pt-28">
        {/* drifting cutouts in the negative space */}
        <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
          {CUTOUTS.map((c, i) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={i}
              src={c.src}
              alt={c.alt}
              loading="eager"
              className="cutout-shadow floaty absolute select-none object-contain"
              style={
                {
                  top: c.top,
                  left: c.left,
                  width: c.size,
                  height: c.size,
                  ["--rot" as string]: `${c.rot}deg`,
                  ["--dur" as string]: `${c.dur}s`,
                  ["--delay" as string]: `${c.delay}s`,
                  transform: `rotate(${c.rot}deg)`,
                } as React.CSSProperties
              }
            />
          ))}
        </div>

        <motion.span
          {...fadeUp}
          className="mb-6 rounded-full border border-rule bg-panel/70 px-4 py-1.5 text-xs lowercase tracking-wide text-ink-soft backdrop-blur"
        >
          your closet · digitized · made beautiful
        </motion.span>

        <motion.h1
          {...fadeUp}
          transition={{ ...fadeUp.transition, delay: 0.05 }}
          className="font-[family-name:var(--font-display)] text-5xl font-semibold leading-[1.04] tracking-tight sm:text-7xl"
        >
          own the things
          <br />
          you love.
        </motion.h1>

        <motion.p
          {...fadeUp}
          transition={{ ...fadeUp.transition, delay: 0.12 }}
          className="mt-7 max-w-xl text-balance text-lg leading-relaxed text-ink-soft"
        >
          add the things you own — and a few you still want — and watch them
          float on a canvas you arrange, section, and decorate however you like.
          it&apos;s not a shopping list. it&apos;s the room, made playful.
        </motion.p>

        <motion.div
          {...fadeUp}
          transition={{ ...fadeUp.transition, delay: 0.18 }}
          className="mt-10 flex flex-col items-center gap-3 sm:flex-row"
        >
          <button
            onClick={scrollToEnter}
            className="rounded-xl bg-ink px-7 py-3.5 text-[15px] lowercase text-panel shadow-[0_14px_34px_var(--shadow)] transition hover:-translate-y-0.5 hover:opacity-90"
          >
            open your wardrobe ✦
          </button>
          <a
            href="#how"
            className="rounded-xl border border-rule bg-panel/60 px-7 py-3.5 text-[15px] lowercase backdrop-blur transition hover:bg-panel"
          >
            see how it works
          </a>
        </motion.div>

        <motion.p
          {...fadeUp}
          transition={{ ...fadeUp.transition, delay: 0.24 }}
          className="mt-6 text-xs lowercase text-ink-soft"
        >
          no commerce · no gifting · purely, quietly yours.
        </motion.p>
      </section>

      {/* ── how it works ────────────────────────────────────── */}
      <section id="how" className="mx-auto max-w-6xl px-6 py-20">
        <SectionLabel kicker="the core loop" title="four steps to a closet you enjoy opening." />
        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { n: "01", icon: "🔗", title: "add an item", body: "paste a product link and the image, title & price are pulled in — or upload your own photo." },
            { n: "02", icon: "✦", title: "it floats", body: "the cutout drops in as a background-removed sticker and drifts gently. drag it anywhere." },
            { n: "03", icon: "🗂", title: "organize", body: "drop it into a section, switch arrange modes, sweep everything by color in one motion." },
            { n: "04", icon: "🎨", title: "beautify", body: "pick a ground, lay down a pattern, add stickers and a title. make the room yours." },
          ].map((s, i) => (
            <motion.div
              key={s.n}
              {...fadeUp}
              transition={{ ...fadeUp.transition, delay: i * 0.06 }}
              className="group relative overflow-hidden rounded-2xl border border-rule bg-panel/70 p-6 backdrop-blur transition hover:-translate-y-1 hover:shadow-[0_18px_40px_var(--shadow)]"
            >
              <span className="font-[family-name:var(--font-display)] text-xs tabular text-ink-soft">
                {s.n}
              </span>
              <div className="mt-3 text-3xl">{s.icon}</div>
              <h3 className="mt-4 text-lg lowercase">{s.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-ink-soft">{s.body}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ── features ────────────────────────────────────────── */}
      <section id="features" className="mx-auto max-w-6xl px-6 py-20">
        <SectionLabel kicker="the systems" title="restraint everywhere — except the cutouts and the joy." />
        <div className="mt-12 grid gap-5 md:grid-cols-2">
          <Feature
            accent="var(--blush)"
            tag="owned · want"
            title="two quiet modes"
            body="everything defaults to owned. flip a single toggle to want — it keeps the same cutout with a small ✦ pin, so it reads as not-here-yet without looking broken."
          />
          <Feature
            accent="var(--olive)"
            tag="sections"
            title="a directory that counts"
            body="name your own sections with an icon and accent color. the monospace directory lists them with live counts — tops (4) — and doubles as the accessible text view."
          />
          <Feature
            accent="var(--cobalt)"
            tag="arrange"
            title="layout × sort"
            body="free collage, tidy grid, shelves, or columns — crossed with sort by recent, section, status, a–z, or a rainbow hue-sweep that glides every item into place."
          />
          <Feature
            accent="var(--brass)"
            tag="beautify"
            title="the room, decorated"
            body="curated grounds and custom hex, low-opacity patterns, draggable stickers and washi-tape corners, a title and tagline. pure scrapbook joy."
          />
        </div>
      </section>

      {/* ── grounds palette ─────────────────────────────────── */}
      <section className="mx-auto max-w-6xl px-6 py-20">
        <SectionLabel kicker="beautify · grounds" title="six calm grounds. the accents come from your things." />
        <motion.div {...fadeUp} className="mt-12 flex flex-wrap justify-center gap-5">
          {[
            { name: "daylight", c: "#a9c4f5" },
            { name: "bone", c: "#f3efe6" },
            { name: "sage mist", c: "#d7e0cc" },
            { name: "butter", c: "#f6e6b8" },
            { name: "bubblegum", c: "#f4d3de" },
            { name: "slate", c: "#1f2330" },
          ].map((g) => (
            <div key={g.name} className="flex flex-col items-center gap-2">
              <div
                className="h-20 w-20 rounded-2xl border border-rule shadow-[0_10px_24px_var(--shadow)] transition hover:-translate-y-1"
                style={{ background: g.c }}
              />
              <span className="text-xs lowercase text-ink-soft">{g.name}</span>
            </div>
          ))}
        </motion.div>
      </section>

      {/* ── enter panel (login / create / recover — unchanged) ─ */}
      <section ref={enterRef} className="mx-auto max-w-6xl scroll-mt-24 px-6 py-24">
        <motion.div {...fadeUp} className="flex flex-col items-center">
          <h2 className="mb-2 text-center font-[family-name:var(--font-display)] text-3xl lowercase tracking-tight sm:text-4xl">
            ready when you are.
          </h2>
          <p className="mb-10 max-w-md text-center text-sm lowercase text-ink-soft">
            open your wardrobe, or make a new one. share your handle, never your
            combination.
          </p>
          <CombinationLock />
        </motion.div>
      </section>

      {/* ── footer ──────────────────────────────────────────── */}
      <footer className="border-t border-rule">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-6 py-8 text-xs lowercase text-ink-soft sm:flex-row">
          <span className="font-[family-name:var(--font-display)]">✦ wardrobe</span>
          <span>cutout · calm · curiosity</span>
          <span>the quiet pleasure of seeing everything you own, arranged just so.</span>
        </div>
      </footer>
    </main>
  );
}

/* ── helpers ──────────────────────────────────────────────── */

function SectionLabel({ kicker, title }: { kicker: string; title: string }) {
  return (
    <motion.div {...fadeUp} className="max-w-2xl">
      <span className="text-xs uppercase tracking-[0.2em] text-ink-soft">{kicker}</span>
      <h2 className="mt-3 font-[family-name:var(--font-display)] text-2xl leading-snug tracking-tight sm:text-4xl">
        {title}
      </h2>
    </motion.div>
  );
}

function Feature({
  accent,
  tag,
  title,
  body,
}: {
  accent: string;
  tag: string;
  title: string;
  body: string;
}) {
  return (
    <motion.div
      {...fadeUp}
      className="relative overflow-hidden rounded-2xl border border-rule bg-panel/70 p-7 backdrop-blur transition hover:-translate-y-1 hover:shadow-[0_18px_40px_var(--shadow)]"
    >
      <span
        aria-hidden
        className="absolute left-0 top-0 h-full w-1"
        style={{ background: accent }}
      />
      <span
        className="inline-block rounded-full px-3 py-1 text-[11px] lowercase tracking-wide text-panel"
        style={{ background: accent }}
      >
        {tag}
      </span>
      <h3 className="mt-4 font-[family-name:var(--font-display)] text-xl lowercase tracking-tight">
        {title}
      </h3>
      <p className="mt-3 text-sm leading-relaxed text-ink-soft">{body}</p>
    </motion.div>
  );
}

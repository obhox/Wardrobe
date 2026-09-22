"use client";

import { useRef } from "react";
import { motion, useReducedMotion } from "framer-motion";
import CombinationLock from "@/components/auth/CombinationLock";

/* ------------------------------------------------------------------ *
 *  wardrobe — landing page
 *  Calm ground, monospace, and a real shot of the studio up top.
 *  Three words to design by: cutout · calm · curiosity. (brief §3)
 *  The CombinationLock (login / create / recover) is kept intact,
 *  embedded as the "enter" panel at the foot of the page.
 * ------------------------------------------------------------------ */

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
      <section className="relative isolate mx-auto flex max-w-6xl flex-col items-center px-6 pb-16 pt-16 text-center sm:pb-24 sm:pt-24">
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

        {/* the real studio — a demo wardrobe, captured from the app itself */}
        <motion.div
          initial={reduce ? false : { opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
          className="relative mt-14 w-full sm:mt-16"
        >
          {/* soft glow so the frame lifts off the ground */}
          <div
            aria-hidden
            className="absolute inset-x-[8%] -bottom-6 top-10 -z-10 rounded-[40px] bg-panel/60 blur-3xl"
          />

          {/* desktop / tablet: browser window */}
          <div className="mx-auto hidden max-w-5xl overflow-hidden rounded-2xl border border-rule bg-panel shadow-[0_40px_90px_-20px_var(--shadow)] sm:block">
            <div className="flex items-center gap-3 border-b border-rule px-4 py-2.5">
              <div className="flex gap-1.5" aria-hidden>
                <span className="h-2.5 w-2.5 rounded-full bg-ink/15" />
                <span className="h-2.5 w-2.5 rounded-full bg-ink/15" />
                <span className="h-2.5 w-2.5 rounded-full bg-ink/15" />
              </div>
              <div className="mx-auto rounded-md bg-ground/50 px-10 py-1 text-[11px] lowercase text-ink-soft">
                wardrobe.obhox.com/studio
              </div>
              <div className="w-[42px]" aria-hidden />
            </div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/landing/studio-desktop.webp"
              width={2400}
              height={1500}
              alt="the wardrobe studio: a sidebar of sections beside a canvas of clothing cutouts — a dress, jacket, coat, sneakers and accessories — some tagged want"
              fetchPriority="high"
              className="block h-auto w-full"
            />
          </div>

          {/* phones: the studio as it looks on a phone */}
          <div className="mx-auto w-[260px] overflow-hidden rounded-[36px] border-[6px] border-ink bg-ink shadow-[0_30px_70px_-16px_var(--shadow)] sm:hidden">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/landing/studio-mobile.webp"
              width={900}
              height={1948}
              alt="the wardrobe studio on a phone: clothing cutouts arranged on a canvas"
              fetchPriority="high"
              className="block h-auto w-full rounded-[30px]"
            />
          </div>
        </motion.div>
      </section>

      {/* ── how it works ────────────────────────────────────── */}
      <section id="how" className="mx-auto max-w-6xl px-6 py-20">
        <SectionLabel kicker="the core loop" title="four steps to a closet you enjoy opening." />
        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { n: "01", icon: "⌁", title: "add an item", body: "paste a product link and the image, title & price are pulled in — or upload your own photo." },
            { n: "02", icon: "✂", title: "it floats", body: "the background is cut away right in your browser — private, instant — and the cutout drifts gently. drag it anywhere." },
            { n: "03", icon: "▤", title: "organize", body: "drop it into a section, switch arrange modes, sweep everything by color in one motion." },
            { n: "04", icon: "✿", title: "beautify", body: "pick a ground, lay down a pattern, add stickers and a title. make the room yours." },
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
          <Feature
            accent="var(--terracotta)"
            tag="wardrobes"
            title="more than one room"
            body="keep a closet, a wishlist and a gear shelf side by side — each with its own look, sections and share link. move things between them in a tap."
          />
          <Feature
            accent="var(--honey)"
            tag="stats · prices"
            title="what it's worth, what it costs"
            body="see your closet's value by section and brand, in your currency. want items with a link are checked for price drops, and you hear about it when they hit your target."
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
          <span>
            cutout · calm · curiosity ·{" "}
            <a href="/privacy" className="underline-offset-2 transition hover:text-ink hover:underline">
              privacy
            </a>
          </span>
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

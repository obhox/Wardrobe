# wardrobe — Project & Brand Guidelines
*Version 0.2 — incorporates: name = **wardrobe**, hero = **Own** (digital closet), purely personal (no commerce/gifting), arrangement modes, canvas beautification, owned/want status, user sections. Stack = TypeScript · Next.js · Tailwind.*

---

## PART ONE — THE IDEA

### 1. One breath
**wardrobe** is your closet, digitized and made beautiful. Add the things you own (and a few you still want), and they float on a canvas you can arrange, section, and decorate however you like. It's not a shopping list — it's the room, made playful.

### 2. What it is now
A **personal closet canvas.** The center of gravity is *what you have*: a visual inventory you actually enjoy opening. "Want" exists as a quiet second mode for things you plan to buy, but the product is about owning, organizing, and admiring — not transacting. Purely personal: no affiliate links, no gifting, no store.

### 3. What it should feel like
The reference aesthetic stands: calm colored ground, monospace directory, cutout objects drifting in negative space. The beauty *is* the product. Restraint everywhere except the cutouts and the things you choose to decorate with.

Emotional core: **the quiet pleasure of seeing everything you own, arranged just so.**

Three words to design by: *cutout · calm · curiosity.*

### 4. Who it's for
People who care about their things and how they're organized — fashion-leaning first, but the model works for any object world (gear, books, furniture). The "I have a great closet but it lives in my head and my camera roll" crowd.

### 5. The core loop
1. **Open your wardrobe** — an empty canvas in your chosen ground.
2. **Add an item** — paste a product link (image + details pulled automatically) *or* upload a photo and fill in a few details. Defaults to **Owned**.
3. **It floats** — the cutout drops in, drifting gently; drag it anywhere.
4. **Organize** — drop it into a **section**; switch **arrange** modes; **beautify** the canvas.
5. **Open it** — click a cutout for its details (brand, where, notes, link, status).

### 6. Feature set

**MVP**
- Create your wardrobe canvas (one per person to start).
- Add by link → auto-fetch image, title, price, source.
- Add by photo → upload + manual details.
- **Status:** Owned (default) / Want.
- **Sections:** user-created, named, with counts in the directory.
- Cutout objects that float + drag-to-reposition; positions persist.
- **Arrange:** layout mode × sort key (see §16).
- **Beautify:** ground color, pattern overlay, stickers, title/tagline, theme presets (see §17).
- Click a cutout → detail view.
- Directory sidebar: searchable, sectioned, with counts (doubles as the accessible/text view).

**Later**
- Cutout (background-removal) polish to a clean sticker every time.
- "Times worn" / wear tracking; outfit building from owned items.
- Multiple wardrobes / saved arrangements.
- Read-only sharing by code (kept out of MVP unless you want it — see §24 Q1).
- Browser extension / share-sheet "save to wardrobe".
- Import from camera roll / Pinterest.

### 7. Pages & screens
- **Studio** — the canvas; owner edit mode.
- **Add an item** — light overlay (paste link *or* upload).
- **Item detail** — overlay card.
- **Arrange** — small popover.
- **Beautify** — side sheet.
- **Empty wardrobe** — first-run invitation.
- **404** — playful ASCII shrug.
- *(If sharing is in: a read-only `w/[code]` guest view.)*

---

## PART TWO — THE NEW SYSTEMS (detailed)

### 8. Status — Owned / Want
- **Default is Owned.** A single toggle flips an item to **Want**.
- **Owned fields:** where bought, purchase date, notes (later: times worn).
- **Want fields:** target price, link, priority.
- **On canvas:** Owned = solid, full-color cutout. Want = the same cutout with a small **"✦ want"** pin in the corner and a slightly softer shadow, so it reads as *not here yet* without looking broken.
- **Filter chips:** `all · owned · want`. Filtering dims (not hides) the other state, so the canvas stays whole.

### 9. Sections
- **User-created**, with a name, a small icon, optional accent color, and an order. Starter sections are offered but fully editable/removable.
- Each item belongs to **one** section (or "Unsorted"). Multi-section is a later idea.
- The **directory** lists sections with counts — the reference's exact structure (`tops (4)`).
- **Move items** by dragging a cutout onto a section in the directory, or via the detail card.
- Sections power the section-based arrange modes (§16).

### 10. (Reserved for future: wear tracking & outfits — out of MVP scope.)

---

## PART THREE — BRAND

### 11. Foundation
- **Essence:** *your closet, made beautiful.*
- **Personality:** a friend with great taste and a tidy, wonderful pinboard. Curatorial, never precious. Lo-fi but considered.
- **Promise:** everything you own, somewhere you'll actually want to look.
- **Voice & tone:** lowercase, plain, a little wry. Name things by what people do — *add an item · arrange · beautify · open*. Active voice, consistent verbs. Errors are direct, never apologetic: *"couldn't read that link — add the details yourself?"* Empty states invite: *"nothing here yet. paste a link to begin."* Warmth comes from **ASCII glyphs** (✦, a cat, a shrug) used sparingly.

### 12. Wordmark
**wardrobe**, set lowercase in the display mono with tight tracking, optionally led by a small ✦. The lowercase is the brand — quiet, personal, not shouting.

### 13. Color
Calm ground so cutouts sing; accents come from the objects, not the UI.

| Token | Name | Hex | Use |
|---|---|---|---|
| `--ground` | Daylight (periwinkle) | `#A9C4F5` | default canvas ground |
| `--ground-haze` | Haze | `#BCD2F8` | radial light center |
| `--ground-dusk` | Dusk | `#9BB8EF` | radial edge / vignette |
| `--ink` | Marker | `#14161B` | primary text |
| `--ink-soft` | Pencil | `#3A4150` | secondary text, counts |
| `--rule` | Rule | `rgba(20,22,27,.42)` | hairlines, underlines |
| `--panel` | Tracing | `#EEF2FB` | detail cards, overlays |
| `--shadow` | Shade | `rgba(36,54,96,.28)` | cutout drop shadow |

**Object accent set** (chips, status pins, section colors — never large fields):
Blush `#F47D7D` · Olive `#6F8D5C` · Honey `#F2C87D` · Brass `#C79A37` · Cobalt `#5A82B6` · Terracotta `#B9633D`.

**Selectable grounds** (the "beautify" palette — each ships a tuned ink + shadow):
Daylight `#A9C4F5` · Bone `#F3EFE6` · Sage Mist `#D7E0CC` · Butter `#F6E6B8` · Bubblegum `#F4D3DE` · Slate `#1F2330` (dark).

### 14. Typography
**Monospace only, always.** It frames every item as an entry in a personal index and makes the colorful cutouts pop. Warmth comes from color, ASCII, and motion — not extra fonts.
- **Display / wordmark:** `Martian Mono` (500–700).
- **Interface / body:** `Spline Sans Mono` (400/500).
- **Codes & prices:** same mono, treated as tabular.
- *(Simpler single-font fallback: `DM Mono` throughout, as in the prototype.)*
- Scale: caption 13 · body 16.5 · item/section 18 · display 28+. Generous line-height; let it breathe.

### 15. The Cutout System — *the signature*
Every item becomes a **background-removed cutout** that floats. Protect this; it's the one unforgettable thing.
- **Form:** transparent PNG/WebP, no card, no frame. The object sits *in* the space, not *on* a surface.
- **Shadow (clay-like):** `drop-shadow(0 16px 18px rgba(36,54,96,.28))`; hover `0 24px 26px rgba(36,54,96,.40)`.
- **Size tiers** (longest edge): Hero ≈200 · Large ≈140 · Medium ≈110 · Small ≈80px. Always mix tiers; uniform grids kill it.
- **Rotation:** random −13°…+13°.
- **Float:** independent per object — `translateY(0 → −8…−16px)`, 6–9s ease-in-out infinite, with ±2° wobble.
- **Load:** staggered rise (opacity 0, `translateY(26px) scale(.92)`), ~0.1s step.
- **Hover:** lift + deeper shadow + name tip.
- **Open:** click → cutout scales up, detail card eases in on Tracing paper, canvas dims a few percent.
- **Overlap encouraged** (collage); auto-placement avoids fully hiding any item.
- **Reduced motion:** no bob/spin — appear + hover-lift only.

### 16. Arrange — *layout × sort*
A small **`arrange ✦`** popover. Layout modes:
- **Free / collage** *(default)* — drag anywhere; organic float; "tidy up" auto-places then you nudge.
- **Tidy grid** — soft snap with gentle stagger (not sterile).
- **Shelves** — horizontal rails grouped by section (the closet metaphor).
- **Columns** — one column per section.

Sort keys (auto-placement / order within a mode):
- **recent · by color (hue sweep — signature) · by section · by status · a–z.**

Switching layout or sort triggers a **Motion layout animation** — items glide to new positions. "Arrange by color" producing a rainbow sweep across the canvas is a moment worth polishing.

### 17. Beautify — canvas customization
A **beautify** side sheet with live preview:
- **Ground:** curated palette + custom hex; optional soft gradient.
- **Pattern overlay:** `none · grid paper · polka dot · gingham · dots`, low opacity (echoes the reference's generators).
- **Stickers / decals:** draggable decorative items (stars, ASCII creatures, scribbles, washi-tape corners) — pure scrapbook joy, non-product, separate from items.
- **Title + tagline** for the wardrobe.
- **Theme presets** bundling ground + pattern + accent (e.g. *Daylight · Bone studio · Midnight · Bubblegum*).

### 18. Directory & layout
- **Left directory** (search + sections + counts + "add an item") = the calm spine and the **accessibility view** (a real, keyboard-navigable list of everything).
- **Open canvas** to its right = the playground.
- Generous negative space; owner controls (`arrange`, `beautify`, add) sit quietly in a corner — no SaaS top-nav chrome.

### 19. States
- **Empty:** *"nothing here yet. paste a link to begin."* with the add field front and center.
- **Loading from a link:** the object materializes (skeleton cutout / shimmer), not a spinner-in-a-box.
- **Scrape failed:** *"couldn't read that link — add the details yourself?"*, pre-filling anything found.

### 20. Accessibility & quality floor
Directory is a genuine navigable list; visible focus rings; alt text from item names; `prefers-reduced-motion` respected; per-ground ink tuned for contrast; responsive (mobile relaxes the canvas, directory moves on top, drag → tap-to-open + arrange).

### 21. Do / Don't
**Do:** keep the ground calm; stay monospace + lowercase; let objects float and overlap; spend boldness on cutouts and decoration.
**Don't:** put cutouts on cards or a neat grid by default; add extra typefaces; use white backgrounds / purple gradients / SaaS chrome; over-animate.

---

## PART FOUR — TECHNICAL ARCHITECTURE (TS · Next.js · Tailwind)

### 22. Stack & key libraries
- **Next.js (App Router)** + **TypeScript**, React Server Components for data; client components for the canvas.
- **Tailwind CSS** for styling; brand tokens mapped into `theme.extend` and exposed as **CSS variables** so a single class set re-themes per wardrobe via a `data-ground` attribute.
- **Motion (Framer Motion)** — float, drag, and `layout` animations (powers Arrange transitions).
- **Zustand** — client canvas/interaction state (selected item, drag, filter).
- **zod** — validate scraped metadata and form input.
- **Data/auth/storage:** Postgres + **Prisma**, or **Supabase** (Postgres + auth + image storage + CDN). Auth is the **combination + passkeys** model (see §24): `@simplewebauthn` for passkeys, `argon2` for hashing the combination, optional magic-link email. Supabase gets you to MVP fastest.
- **Link metadata:** `/api/scrape` route handler using `open-graph-scraper` (or `cheerio`) server-side; cache by URL; graceful fallback to manual.
- **Background removal:** `/api/cutout` using `@imgly/background-removal` (runs in-browser/WASM, no per-image cost) or a hosted model (remove.bg / Replicate) for quality; store transparent WebP. If low-confidence, keep original on a soft chip.
- **Images:** `next/image` for delivery; transparent WebP for cutouts.

### 23. Shape

**Data model (Prisma-style sketch)**
```ts
User      { id, handle, displayName?, combinationHash, lookupHash,
            recoveryCardHash?, recoveryQuestions[], recoveryEmail?,
            passkeys[], avatar?, defaultTheme }
RecoveryQuestion { id, userId, prompt, answerHash }   // exactly two
Wardrobe  { id, ownerId, title, tagline?,
            theme: { ground, pattern, accent },
            layoutMode, sortKey, shareCode?, visibility }
Section   { id, wardrobeId, name, icon?, color?, order }
Item      { id, wardrobeId, sectionId?,
            imageUrl, cutoutUrl?, sourceUrl?,
            name, brand?, price?, currency?,
            status: 'owned' | 'want',
            purchasedAt?, boughtAt?, targetPrice?, notes?,
            posX, posY, rotation, sizeTier,
            sourceType: 'manual' | 'scraped', createdAt }
Sticker   { id, wardrobeId, kind, posX, posY, rotation, scale }
```

**Folder layout**
```
app/
  page.tsx                  // landing / open your wardrobe
  studio/page.tsx           // canvas (auth)
  w/[code]/page.tsx         // (optional) read-only guest view
  api/scrape/route.ts       // link → metadata
  api/cutout/route.ts       // background removal
components/
  canvas/{Canvas,Cutout,Sticker}.tsx
  directory/{Sidebar,SectionRow}.tsx
  panels/{AddItem,ItemDetail,ArrangePopover,BeautifyPanel}.tsx
lib/
  scrape.ts cutout.ts theme.ts layout.ts  // arrange algorithms
  db.ts types.ts store.ts                  // zustand
```

- **Theming:** define brand palette as CSS vars on `:root`; each ground sets `--ground / --ink / --shadow`; Tailwind utilities read the vars, so switching grounds is one attribute change.
- **Persistence:** positions/rotations saved via debounced server actions so the collage is stable and identical on reload.
- **Motion safety:** gate float/bob behind Tailwind `motion-safe:` and Framer's reduced-motion.

---

## 24. Identity & access — "the combination"
No usernames, no email walls. A wardrobe has a lock, so the account works like one.

**Your combination.** On first open, wardrobe generates a unique, memorable passphrase from a closet/object vocabulary — e.g. `linen · brass · moth · 7`. You can reroll until one feels like yours. This single combination *is* your account: it identifies you and it lets you in. Nothing to invent, nothing to look up.

**Why "two-way".** The combination faces both directions — that's the idea:
- **Inward (your key):** turn the combination to unlock and edit your wardrobe.
- **Outward (your tag):** a public, non-secret slice — your **handle**, e.g. `✦ moth-7` — is how the wardrobe is addressed, and (if sharing is ever on) how a friend peeks read-only.
One lock, two faces: the secret turn that opens it, and the name on the tag.
*(If you instead meant a literal second factor, that's the "second turn" below — trivial to add.)*

**The second turn (optional, recommended).** After the first login on a device, wardrobe offers a **passkey** (Face ID / fingerprint / device key) so you rarely type the combination again, with a short 2-digit "dial" PIN as a lighter alternative. Second *way* in = something you know (combination) + something you have (device).

**The spare key — recovery.** Several optional nets, all set in your account; pick what suits you:
- **Secret questions** *(the personal one)* — write **two** prompts only you'd know and set their answers. To recover, you enter your public **handle** to locate the account, then answer both to set a new combination. Make these custom and obscure: the classic *maiden name / pet / partner's name / first kiss* answers are the easy ones for a sibling, partner, or anyone with your socials to guess or google — and a wardrobe is exactly the kind of thing you might be keeping *from* those people. Better prompts are stable, private, and un-googleable (an inside joke, a number you privately attach to a memory). Answers are **editable anytime** — useful, since some "facts" change.
- **Recovery card** — a one-time longer backup combination shown at signup: *"screenshot this; it's your spare key."*
- **Email magic-link** — optional; safest net, but needs an address.

Defense in depth: secret questions are strongest **combined** with another signal — a previously-trusted device/passkey, or an email ping whenever a reset is attempted — because handle + answers alone can be weak if the answers are guessable. So treat questions as *a* layer, not the whole vault.

**The look.** The login screen is a **combination dial / luggage tag** — monospace, lowercase, words clicking into place like a lock, an ASCII padlock, the last dial swinging the door open onto your canvas. Tactile and unmistakably *wardrobe*.

**Security rules (non-negotiable).**
- Combinations are **generated**, not free-typed, for entropy (4 words + a digit from a large list ≈ strong); if users customize, enforce a strength floor.
- Store only an **argon2id hash** (`combinationHash`); find accounts via a separate salted `lookupHash`, constant-time; never log or re-display the raw combination.
- **Rate-limit + exponential back-off** on attempts; soft-lock and notify after repeated failures.
- **Recovery answers** are normalized (trim, lowercase, collapse spaces) then **argon2id-hashed** like the combination; require *all* prompts correct to pass; rate-limit and notify on reset attempts; never store or echo raw answers.
- Sessions in **httpOnly, secure, same-site cookies**, short-lived + refresh.
- Copy that warns clearly: **share your handle, never your combination.**

**In the stack.** **WebAuthn passkeys** (`@simplewebauthn/server` + browser API) for the day-to-day unlock; the generated combination as the human identity + recovery; **argon2** for hashing; optional magic-link email via the auth provider (Supabase Auth or Auth.js). The combination maps to the `User` record; the handle is its public derivative.

---

## 25. Decisions (locked)
All previously-open questions, resolved.

1. **The "two-way" model → both.** The inward-key / outward-tag duality is the identity itself; a **passkey** is offered as the optional second factor and day-to-day frictionless unlock. Rationale: the duality carries the brand, the passkey carries the security and the convenience.
2. **Recovery → two secret questions + a recovery card by default; email optional.** Rationale: questions fit the personal, diary-like character and need no email; the card is a hard offline backup; email is the safest net for anyone willing to attach one. Questions are custom-written, editable, and never the sole gate.
3. **Combination → system-generated, with reroll and constrained customization.** Users reroll until one feels theirs and may swap individual words from curated lists, but a strength floor is enforced (no weak free-typed codes). Rationale: keeps real entropy while still feeling chosen, not assigned.
4. **Sharing → solo at MVP, architected to switch on later.** No sharing ships in v1; the `handle`/`visibility` fields stay so read-only handle-peek can land as a clean v1.1. Rationale: honors "purely personal," keeps the first build focused, and throws nothing away.
5. **Platform → mobile-first product, desktop-enhanced canvas.** Core flows (add by link/photo, browse, organize via the directory) are mobile-first; the free-drag collage is the desktop delight. On mobile, default to an auto/tidy arrange with tap-to-open and long-press-to-move. Rationale: capture happens on phones; the magical drag canvas is genuinely better with a cursor, so it enhances rather than gates.
6. **Background removal → auto-cut by default (in-browser `@imgly`), with preview + keep-original fallback.** Every add previews the cutout; if it looks rough the user keeps the original on a soft chip or retries. Rationale: free, private, no per-image cost, and never ships a bad cutout.
7. **One wardrobe per person at launch; sections do the sub-organizing.** Multiple wardrobes/collections come later. Rationale: sections already give organizational depth, so one canvas keeps the MVP simple and the mental model clean.

### Next step
Scaffold the Next.js (App Router) + TypeScript + Tailwind project, starting with the combination-lock login and recovery flow, then the canvas, directory, and the add / arrange / beautify panels.

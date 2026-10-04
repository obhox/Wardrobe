# ✦ wardrobe

> your closet, digitized and made beautiful.

A personal closet canvas. Add the things you own (and a few you still want), and
they sit on a calm canvas you can arrange, section, and theme.
Built from the project brief (`wardrobe-brief.md`).

**Stack:** Next.js (App Router) · TypeScript · Tailwind v4 · Prisma · PostgreSQL ·
Framer Motion · Zustand · WebAuthn passkeys · argon2. Ships as a Docker image,
deployable to Railway.

---

## Quick start (local)

```bash
cp .env.example .env          # then edit (defaults match docker compose)
docker compose up -d db minio minio-init   # Postgres + MinIO image bucket
npm install                   # also runs `prisma generate`
npm run db:migrate            # apply migrations
npm run db:seed               # optional: demo wardrobes (login below)
npm run dev                   # http://localhost:3000
```

If port 5432 is taken, run the database elsewhere: `WARDROBE_PG_PORT=5439 docker compose up -d db`
and point `DATABASE_URL` at it (a gitignored `.env.local` overrides `.env` for `next dev`).

**Demo login** (after `db:seed`): handle `moth-7`, combination `linen · brass · moth · button · 7`.

## Quick start (Docker, full stack)

```bash
docker compose up --build     # Postgres + MinIO + app, migrations run on boot
# open http://localhost:3000
```

## Deploy (Railway / Coolify / any Docker host)

1. Add a **PostgreSQL** database and an **S3-compatible bucket** (Cloudflare R2,
   Supabase Storage, AWS S3, MinIO). Make objects publicly *readable* (GetObject
   only — not listable) and add a CORS rule allowing `GET` from your app origin.
2. Build the `Dockerfile`. Pass `S3_PUBLIC_URL` as a **build arg** too — it goes
   into the Content-Security-Policy.
3. Set service variables (see `.env.example`): `DATABASE_URL`, `LOOKUP_PEPPER`
   (`openssl rand -base64 48`), `RP_ID`, `APP_ORIGIN`, `RESEND_API_KEY`,
   `MAIL_FROM`, the `S3_*` variables and `CRON_SECRET`. The server refuses to
   start in production without the pepper, `RP_ID` and `APP_ORIGIN`.
4. Deploy. The container runs `prisma migrate deploy` and only then starts the
   server; a failed migration stops the deploy instead of serving a broken schema.
   Health check: `/api/health`.
5. Schedule price checks (every ~6 hours is fine — each run only rechecks items
   whose price is more than a day old, up to 40 at a time):
   `curl -fsS -X POST -H "authorization: Bearer $CRON_SECRET" https://<app>/api/cron/prices`

### Upgrading an existing database (first deploy of v0.3)

Earlier versions synced the schema with `db push`, so existing databases have no
migration history. Mark the baseline as already applied **once**, then deploy:

```bash
DATABASE_URL=… npx prisma migrate resolve --applied 0_init
```

The next boot applies the rest (new tables for rate limits, prices and
notifications, multiple wardrobes). Existing sign-in sessions are invalidated,
since sessions are now stored hashed; everyone signs in again once.

If photos were saved inline (before S3 storage), move them into the bucket:

```bash
npx tsx scripts/migrate-inline-images.ts --dry-run
npx tsx scripts/migrate-inline-images.ts            # add --remote to also copy shop hotlinks
```

---

## How auth works — "the combination" (brief §24)

- On **create**, the server generates a passphrase from a closet vocabulary, e.g.
  `linen · brass · moth · button · 47`: 4 words from 64-word lists and a number,
  ~30 bits. Reroll until one feels yours.
- **Sign in with handle + combination.** The handle picks the account and the
  combination is checked against that account only, so a guess can never unlock
  "whoever uses this phrase". Failures back off exponentially per handle, with a
  per-IP limit on top. Limits live in Postgres, so they hold across instances and deploys.
- Stored as an **argon2id** hash. The raw combination is never stored or logged.
- **Email codes** for passwordless sign-in and recovery: 6 digits, 15 minutes, 5
  guesses per code, 12 per day, sends rate-limited per address and IP. An email
  is only attached after it's verified.
- **Passkeys** (WebAuthn): add them from *account*. The challenge is pinned to the
  browser with a short-lived cookie and used once.
- **Sessions** are random tokens in an httpOnly cookie; the database stores only
  their sha256. You can see and sign out devices from *account*.
- **Writes are same-origin only** (`src/proxy.ts`), and the extension's origin
  is allowed explicitly.

## Architecture

```
src/
  proxy.ts                    cross-site write guard (Next 16 "proxy")
  app/
    page.tsx                  landing → sign in
    (app)/                    everything behind sign-in, inside the app shell (tab bar / rail)
      studio/[id]/            one wardrobe's canvas; /studio → last opened
      you/                    wardrobes and account
    w/[code]/                 read-only guest view (per-wardrobe share link)
    styleguide/               tokens and component kit on one page (development only)
    api/
      auth/…                  login · register · email codes · recover · passkeys · sessions · combination
      wardrobes · items · sections · upload · img · scrape · stats · notifications
      cron/prices             price checker (Bearer CRON_SECRET)
      account                 export / delete
  components/
    ui/                       the kit: Button · Field · Chip · Segmented · Switch · Card ·
                              Dialog (focus trap, Esc) · Toasts (undo)
    shell/                    AppShell (tab bar on phones, rail on wider screens)
    item/                     ItemTile (one tile for the owner's board and the guest page) · GuestItems
    canvas/                   Canvas · Cutout · Toolbar · EmptyState
    directory/                Sidebar · SectionRow · WardrobeSwitcher · MobileBar · Notifications
    panels/                   AddItem · ItemDetail · Arrange · Appearance · Share · Stats
    you/                      WardrobesManager · AccountSettings
  lib/
    store (zustand) · layout · theme · nav · brand · color · cutout · img · api · hooks
    server/                   safe-fetch (SSRF guard) · storage (S3) · images (sharp) · scrape ·
                              price-check · fx · schemas (zod) · http helpers
    auth/                     combination · crypto · session · challenge · rate-limit · mailer
prisma/                       schema + migrations
scripts/                      one-off data migrations
```

- **Arrange**: two layouts. The board is a scrolling grid that flows items at
  render time, so switching to it never overwrites your hand-made collage. Only
  the collage stores positions (0..1 fractions); drags save debounced, sending
  only what moved. Phones always get the board.
- **Background removal** runs in the browser (`@imgly/background-removal`,
  `lib/cutout.ts`). The model downloads once from imgly's CDN (set
  `NEXT_PUBLIC_IMGLY_PUBLIC_PATH` to self-host). Every add previews the cutout
  against the original, and a rough cutout falls back to the original.
- **Images** are validated by their bytes, re-encoded to WebP with `sharp`
  (metadata stripped) and stored in the bucket. Shop photos are copied on save,
  so nothing hotlinks. The `/api/img` proxy serves signed-in users, or signed
  URLs for guests and the extension. It only serves raster images, and every hop
  is checked against private addresses.
- **Price tracking**: want items with a link are re-read by `/api/cron/prices`,
  at most once every 24 hours per item. Snapshots feed the sparkline in the
  detail card. A drop or a target hit creates a notification and at most one
  email digest a day.
- **One currency per item.** Each item has a tracking currency (its own), and
  the current price, lowest price, target and history all live in it. Shops
  quote by country or session, so an observed price in another currency is
  converted before anything is compared — a shop flipping $92 to ₦138,000 is
  not a price rise, and a target is judged in the item's currency. If a price
  can't be converted (no code on the page, or the rates feed is down) the check
  records only the time rather than a number that means something else, and
  each snapshot keeps what the page actually said. Changing an item's currency
  in the studio asks whether to convert the amounts (moving the history with
  them) or just relabel a currency that was detected wrongly.
- **Stats** convert every price into your display currency (daily FX rates).
- **Theming**: a wardrobe has one curated theme (`lib/theme.ts`), set with
  `data-theme` on the stage its items sit on; the rest of the app stays neutral.
  Tokens (colour, type scale, corners, elevations) live in `app/globals.css`, and
  the fonts are self-hosted from `app/fonts/`.
- **Brand**: the product name, mark, tagline and production origin come from
  `brand.json`, read by the app, the emails and the extension build.

## Scripts

| script | what |
|---|---|
| `npm run dev` | dev server |
| `npm run build` | `prisma generate` + `next build` |
| `npm start` | production server |
| `npm run lint` · `npm run typecheck` · `npm test` | ESLint, TypeScript, and the unit tests (vitest) |
| `npm run db:migrate:dev` | create a new migration after editing the schema |
| `npm run db:migrate` | apply migrations (`migrate deploy`) |
| `npm run db:seed` | seed the demo wardrobe |
| `npm run db:studio` | Prisma Studio |
| `npm run ext:build` | build the Chrome extension into `extension/dist` (see `extension/README.md`) |
| `npm run ext:dev` | same, pointed at `localhost:3000` |
| `npm run ext:zip` | store build + zip for the Chrome Web Store (listing in `extension/STORE.md`) |

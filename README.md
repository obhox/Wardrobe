# ✦ wardrobe

> your closet, digitized and made beautiful.

A personal closet canvas. Add the things you own (and a few you still want), and
they float on a calm, monospace canvas you can arrange, section, and decorate.
Built from the project brief (`wardrobe-brief.md`).

**Stack:** Next.js (App Router) · TypeScript · Tailwind v4 · Prisma · PostgreSQL ·
Framer Motion · Zustand · WebAuthn passkeys · argon2. Ships as a Docker image,
deployable to Railway.

---

## Quick start (local, no Docker)

```bash
cp .env.example .env          # then edit DATABASE_URL etc.
npm install                   # also runs `prisma generate`
npm run db:push               # create tables from the schema
npm run db:seed               # optional: demo wardrobe (login below)
npm run dev                   # http://localhost:3000
```

You need a Postgres instance. The fastest local one:

```bash
docker run -d --name wardrobe-pg -p 5432:5432 \
  -e POSTGRES_USER=wardrobe -e POSTGRES_PASSWORD=wardrobe -e POSTGRES_DB=wardrobe \
  postgres:16-alpine
```

**Demo login** (after `db:seed`): combination `linen · brass · moth · 7`.

## Quick start (Docker, full stack)

```bash
docker compose up --build     # Postgres + app, schema auto-synced on boot
# open http://localhost:3000
```

## Deploy to Railway

1. Create a new Railway project and add a **PostgreSQL** plugin.
2. Add this repo as a service — Railway picks up `railway.json` and builds the
   `Dockerfile`.
3. Set service variables:
   - `DATABASE_URL` → reference `${{ Postgres.DATABASE_URL }}`
   - `LOOKUP_PEPPER` → a long random string (`openssl rand -base64 48`)
   - `RP_ID` → your domain, e.g. `wardrobe-production.up.railway.app`
   - `APP_ORIGIN` → `https://<that domain>`
4. Deploy. The container runs `prisma db push` on boot to sync the schema, then
   starts the server. Health check is at `/api/health`.

> When you're ready for versioned migrations, run `npx prisma migrate dev --name init`
> locally to create `prisma/migrations/`; the entrypoint will then use
> `prisma migrate deploy` automatically instead of `db push`.

---

## How auth works — "the combination" (brief §24)

- On **create**, the server generates a memorable passphrase from a closet
  vocabulary (e.g. `linen · brass · moth · 7`). Reroll until one feels yours.
  This single combination *is* the account.
- Stored as an **argon2id** hash; a separate salted **lookup hash** (HMAC with
  `LOOKUP_PEPPER`) finds the account in constant time. The raw combination is
  never stored or logged.
- **Handle** (e.g. `moth-7`) is the public, non-secret tag — the outward face.
- **Passkeys** (WebAuthn) are offered as the optional "second turn" for
  frictionless unlock (`/api/auth/passkey/*`).
- **Recovery**: two custom secret questions *and/or* a one-time recovery card.
  Answers are normalized + argon2id-hashed; all questions must pass. Rate-limited
  with exponential back-off.

## Architecture

```
src/
  app/
    page.tsx                  landing → combination-lock login
    studio/                   the canvas (auth-gated) + client orchestrator
    w/[code]/                 optional read-only guest view (sharing off at MVP)
    api/
      auth/…                  generate · register · login · logout · me · recover
      auth/passkey/…          WebAuthn register + authenticate
      wardrobe · items · sections · stickers · scrape · health
  components/
    auth/CombinationLock      the luggage-tag login/create/recover UI
    canvas/                   Canvas · Cutout · Sticker · OwnerControls · EmptyState
    directory/                Sidebar · SectionRow (the accessible list view)
    panels/                   AddItem · ItemDetail · ArrangePopover · BeautifyPanel
  lib/
    db · types · store(zustand) · api · theme · layout · color · wardrobe
    auth/                     combination · crypto · session · webauthn · rate-limit
prisma/schema.prisma          User · Wardrobe · Section · Item · Sticker · Passkey · …
```

- **Theming** is CSS-variable driven: grounds/patterns/accents switch via the
  `data-ground` attribute (see `globals.css`), so re-theming is one attribute.
- **Positions** are stored as 0..1 fractions so the collage is stable across
  resizes; drags are persisted debounced via `/api/items/positions`.
- **Arrange** (layout × sort, incl. the by-color hue sweep) lives in `lib/layout.ts`.

## Notes / intentional MVP scope

- **Fonts** load at runtime from Google Fonts (`Martian Mono`, `Spline Sans
  Mono`, `DM Mono`) so offline/CI builds never fail. Self-host later if desired.
- **Background removal** (brief §15/§25): cutouts currently use the original
  image with the clay drop-shadow. To enable auto-cut, add
  `@imgly/background-removal` and call it in `AddItem` before saving `cutoutUrl`.
- **Image storage**: link-added items reference the remote image; uploaded photos
  are stored inline as data URLs for now. Wire object storage (S3/Supabase/Railway
  volume) and an `/api/upload` route for production-grade uploads.
- **Sharing** is off at MVP (decision §25.4); the `handle`/`shareCode`/`visibility`
  fields and the `w/[code]` route are in place to switch it on later.

## Scripts

| script | what |
|---|---|
| `npm run dev` | dev server |
| `npm run build` | `prisma generate` + `next build` |
| `npm start` | production server |
| `npm run db:push` | sync schema to the database |
| `npm run db:migrate` | apply migrations (`migrate deploy`) |
| `npm run db:seed` | seed the demo wardrobe |
| `npm run db:studio` | Prisma Studio |

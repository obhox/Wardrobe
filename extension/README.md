# ✦ wardrobe — chrome extension

Save the thing you're looking at straight into your wardrobe.

- **Toolbar button** (or `Alt+Shift+W`): reads the product from the page you're on —
  name, brand, price + currency, every big photo — pick a photo from the strip, a
  section (or make a new one), owned/want and a size, then **add ✦**. Undo right after.
- **Right-click** an image, a link or the page → "add … to wardrobe".
- **Pages it can't read** (chrome://, the Web Store, PDFs): paste a link instead; the
  server-side reader (`/api/scrape`) fetches it.
- **Duplicates**: warns when that link is already in your wardrobe.
- **Drafts**: close the popup mid-edit and your changes are there when you reopen it.

It reads the page in *your* tab, so it works on shops that only show the server-side
link preview a bot check (AliExpress, Temu, …). Price parsing and currencies are the
app's own code (`src/lib/scrape-price.ts`, `src/lib/currency.ts`), bundled in.

## Layout

```
extension/
  build.mjs          builds dist/ (manifest is generated here) and the store zip
  src/               popup.js · background.js · extract.ts (page reader) · config.js
  static/            popup.html · popup.css · icons/ · fonts/ (bundled, SIL OFL)
  store/             store artwork: shot.html + mock.js render the real popup; render.mjs
  STORE.md           Web Store listing copy, permission justifications, privacy answers
```

## Build & load

```bash
npm run ext:build    # → extension/dist, talks to https://wardrobe.obhox.com
npm run ext:dev      # → extension/dist, talks to http://localhost:3000
npm run ext:zip      # store build + extension/wardrobe-extension-<version>.zip
npm run ext:art      # re-render store images (needs :8787 server, see STORE.md)
```

1. `chrome://extensions` → turn on **Developer mode** → **Load unpacked** → `extension/dist`.
2. Sign in to wardrobe in a normal tab, then click ✦ on any product page.
3. After a rebuild, hit the reload icon on the extension's card.

## How it signs in

There's no separate login. The popup calls the app's API with your existing
`wardrobe_session` cookie — Chrome sends it because the extension has host
permission for the wardrobe origin. Signed out? The popup links to sign-in.

API used: `GET /api/auth/me`, `GET /api/sections` (falls back to `GET /api/wardrobe`),
`POST /api/sections`, `GET /api/items?sourceUrl=` (duplicate check), `POST /api/items`,
`DELETE /api/items/:id` (undo), `POST /api/scrape` (links), `/api/img` (photo proxy).

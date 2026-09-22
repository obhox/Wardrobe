# Chrome Web Store listing — wardrobe

Everything the developer dashboard asks for, ready to paste.
Upload: `extension/wardrobe-extension-<version>.zip` (`npm run ext:zip`).
Images: `extension/store/out/` (`npm run ext:art`, see "Images" below).

---

## Store listing tab

**Name** (from the manifest): wardrobe — save to closet

**Summary** (manifest description, ≤132 chars):
save anything you're looking at into your wardrobe — photo, name, brand and price, picked up from the page in one click.

**Category:** Shopping  *(alternative: Productivity)*

**Language:** English

**Description:**

```
wardrobe is your closet, digitized and made beautiful. this extension is the fastest way to fill it.

on any product page, click ✦ (or press alt+shift+w). wardrobe reads the page you're looking at and fills in the photo, name, brand and price for you. flick through every photo on the page, pick a section, mark it owned or want, choose a size — and add it. it floats onto your wardrobe canvas, ready to arrange.

✦ one click from any shop — works on the page you're actually viewing, so it picks up products that link previews can't see.
✦ every photo on the page — choose the best shot from a strip of thumbnails.
✦ right-click anything — "add this image", "add linked product" or "add this page".
✦ price and currency — detected from the page (₦, €, £, ¥, $ and more).
✦ sections — file it straight into tops, shoes or a new section you make on the spot.
✦ owned or want — keep what you have and what you're saving up for side by side.
✦ no accidental doubles — it tells you when that link is already in your wardrobe.
✦ nothing lost — close the popup mid-edit and your draft is still there when you reopen it.
✦ changed your mind? undo right after adding.

wardrobe is purely personal: no ads, no affiliate links. the extension doesn't track your browsing — it only reads a page when you click it, and only sends the item you confirm to your own wardrobe.

you'll need a wardrobe account — sign up at wardrobe.obhox.com.
```

**Homepage URL:** https://wardrobe.obhox.com
**Support URL:** https://wardrobe.obhox.com  *(or a support email — see "Before you submit")*

### Images

| slot | file | size |
|---|---|---|
| Store icon | `static/icons/icon-128.png` | 128×128 (96px artwork + padding) |
| Screenshot 1 | `store/out/screenshot-1-save.png` | 1280×800 |
| Screenshot 2 | `store/out/screenshot-2-added.png` | 1280×800 |
| Screenshot 3 | `store/out/screenshot-3-duplicates.png` | 1280×800 |
| Screenshot 4 | `store/out/screenshot-4-any-link.png` | 1280×800 |
| Small promo tile | `store/out/promo-small-440x280.png` | 440×280 |
| Marquee promo tile | `store/out/promo-marquee-1400x560.png` | 1400×560 |

The screenshots are the real popup (from `extension/dist`) with sample data. To
regenerate: build, serve the project root on :8787 (`python3 -m http.server 8787`),
then `npm run ext:art`.

---

## Privacy practices tab

**Single purpose:**
Save products from web pages into the user's wardrobe (a personal digital closet at wardrobe.obhox.com).

**Permission justifications:**

| permission | justification |
|---|---|
| `activeTab` | Reads the product (name, brand, price, photos) from the current tab only when the user clicks the toolbar button, uses the keyboard shortcut or picks a context-menu item. No access to any other tab or page. |
| `scripting` | Injects the bundled page reader (`extract.js`) into that active tab, after the user asks, to read the product details. Nothing runs on pages automatically. |
| `storage` | Keeps small preferences on the device (last currency, section and size; a cached section list) and an unsaved draft of the form so it survives the popup closing. |
| `contextMenus` | Adds "add this image / linked product / this page to wardrobe" to the right-click menu. |
| Host permission `https://wardrobe.obhox.com/*` | The extension's own backend: checks sign-in, lists the user's sections, saves the item, and loads photo previews through the site's image proxy. Uses the user's existing wardrobe sign-in cookie. |

**Remote code:** No, I am not using remote code. (All JavaScript is bundled in the package; fonts are bundled too.)

**Data usage — what the extension collects** (tick these):
- **Website content** — the product name, brand, price, photo links and page URL of the page the user chooses to save, sent only when they press "add".
- **Authentication information** — it relies on the user's existing wardrobe.obhox.com session cookie to call the wardrobe API. (It never reads or stores passwords.)

Do **not** tick: personally identifiable information, health, financial and payment information, personal communications, location, web history, user activity.

**Certify** (all true):
- I do not sell or transfer user data to third parties, outside of the approved use cases.
- I do not use or transfer user data for purposes that are unrelated to my item's single purpose.
- I do not use or transfer user data to determine creditworthiness or for lending purposes.

**Privacy policy URL:** https://wardrobe.obhox.com/privacy

---

## Distribution tab

- Visibility: Public (or Unlisted for a soft launch)
- Regions: all
- Pricing: free

---

## Before you submit

- [ ] Deploy the site first: the listing links to `/privacy`, and the duplicate
      warning / fast section list use the new `GET /api/items` and `GET /api/sections`.
- [ ] Try the built extension from `extension/dist` against wardrobe.obhox.com
      while signed in (load unpacked), end to end: add, undo, new section.
- [ ] Bump `VERSION` in `extension/build.mjs` for every new upload.
- [ ] Decide on a support contact (email or page) for the listing and the privacy policy.

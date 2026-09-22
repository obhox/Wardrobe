// Renders the Chrome Web Store images from shot.html with headless Chrome.
// Needs the project root served on :8787 (python3 -m http.server 8787) and a
// built extension/dist.  Output: extension/store/out/*.png
//
//   node extension/store/render.mjs

import { execFileSync } from "node:child_process";
import { mkdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const CHROME = process.env.CHROME ?? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const BASE = "http://127.0.0.1:8787/extension/store/shot.html";
const out = path.join(path.dirname(fileURLToPath(import.meta.url)), "out");
mkdirSync(out, { recursive: true });

const shots = [
  ["screenshot-1-save.png", "kind=screenshot&scene=form", 1280, 800],
  ["screenshot-2-added.png", "kind=screenshot&scene=done", 1280, 800],
  ["screenshot-3-duplicates.png", "kind=screenshot&scene=dupe", 1280, 800],
  ["screenshot-4-any-link.png", "kind=screenshot&scene=paste", 1280, 800],
  ["promo-small-440x280.png", "kind=tile", 440, 280],
  ["promo-marquee-1400x560.png", "kind=marquee", 1400, 560],
];

for (const [file, query, w, h] of shots) {
  execFileSync(CHROME, [
    "--headless=new",
    "--disable-gpu",
    "--hide-scrollbars",
    "--force-device-scale-factor=1",
    `--window-size=${w},${h}`,
    "--virtual-time-budget=6000",
    `--screenshot=${path.join(out, file)}`,
    `${BASE}?${query}`,
  ], { stdio: "ignore" });
  console.log(`✦ ${file}`);
}

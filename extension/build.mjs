// Builds the Chrome extension into extension/dist (load that folder unpacked).
//
//   node extension/build.mjs          production build → wardrobe.obhox.com
//   node extension/build.mjs --dev    talks to http://localhost:3000 instead
//   node extension/build.mjs --zip    production build + Web Store zip
//
// The manifest lives here (not as a static file) so the dev and store builds
// can't drift: only the server origin and host permission differ.

import { build } from "esbuild";
import { cp, mkdir, rm, writeFile } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const VERSION = "1.1.0";
const PROD_SERVER = "https://wardrobe.obhox.com";
const DEV_SERVER = "http://localhost:3000";

const root = path.dirname(fileURLToPath(import.meta.url));
const dist = path.join(root, "dist");
const dev = process.argv.includes("--dev");
const zip = process.argv.includes("--zip");
const server = dev ? DEV_SERVER : PROD_SERVER;

await rm(dist, { recursive: true, force: true });
await mkdir(dist, { recursive: true });

await build({
  entryPoints: ["src/popup.js", "src/background.js", "src/extract.ts"].map((p) => path.join(root, p)),
  outdir: dist,
  bundle: true,
  format: "iife",
  target: "chrome114",
  minify: !dev,
  sourcemap: dev ? "inline" : false,
  define: { __SERVER__: JSON.stringify(server) },
  legalComments: "none",
  logLevel: "warning",
});

await cp(path.join(root, "static"), dist, { recursive: true });

const icons = { 16: "icons/icon-16.png", 32: "icons/icon-32.png", 48: "icons/icon-48.png", 128: "icons/icon-128.png" };
const manifest = {
  manifest_version: 3,
  name: dev ? "wardrobe (dev)" : "wardrobe — save to closet",
  short_name: "wardrobe",
  version: VERSION,
  description: "save anything you're looking at into your wardrobe — photo, name, brand and price, picked up from the page in one click.",
  homepage_url: PROD_SERVER,
  icons,
  action: { default_title: "save to wardrobe", default_popup: "popup.html", default_icon: icons },
  background: { service_worker: "background.js" },
  permissions: ["activeTab", "scripting", "storage", "contextMenus"],
  host_permissions: [`${server}/*`],
  minimum_chrome_version: "114",
  commands: {
    _execute_action: {
      suggested_key: { default: "Alt+Shift+W" },
      description: "save this page to wardrobe",
    },
  },
};
await writeFile(path.join(dist, "manifest.json"), JSON.stringify(manifest, null, 2) + "\n");

console.log(`✦ built ${manifest.name} ${VERSION} → extension/dist (${server})`);

if (zip) {
  if (dev) throw new Error("--zip is for the store build; drop --dev");
  const out = path.join(root, `wardrobe-extension-${VERSION}.zip`);
  await rm(out, { force: true });
  execFileSync("zip", ["-qrX", out, ".", "-x", ".DS_Store", "*/.DS_Store"], { cwd: dist });
  console.log(`✦ zipped → extension/${path.basename(out)}`);
}

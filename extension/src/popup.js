// The toolbar popup: read the product off the current tab, let the user tidy
// it up, save it to their wardrobe. Bundled by extension/build.mjs.

import { SERVER } from "./config.js";
import { CURRENCIES } from "../../src/lib/currency";
import { parseAmount } from "../../src/lib/scrape-price";

const $ = (id) => document.getElementById(id);
const VIEWS = ["status", "paste", "form", "done"];

const state = {
  sourceUrl: "",
  images: [],
  index: 0,
  status: "owned",
  sizeTier: "medium",
  sections: [],
  wantSection: "", // last-used / drafted section, applied once the list has it
  savedId: null,
};

// ---- plumbing -------------------------------------------------------------

class HttpError extends Error {
  constructor(message, status) {
    super(message);
    this.status = status;
  }
}

async function api(path, init = {}) {
  const res = await fetch(SERVER + path, {
    credentials: "include",
    ...init,
    headers: { "content-type": "application/json", ...init.headers },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new HttpError(data?.error || `request failed (${res.status})`, res.status);
  return data;
}

const proxied = (url) => `${SERVER}/api/img?url=${encodeURIComponent(url)}`;

function openTab(url) {
  chrome.tabs.create({ url });
  window.close();
}

function show(view) {
  for (const v of VIEWS) $(v).hidden = v !== view;
}

// status view: a message and, optionally, one button
function say(message, action) {
  const box = $("status");
  box.replaceChildren();
  const p = document.createElement("span");
  p.textContent = message;
  box.append(p);
  if (action) {
    const b = document.createElement("button");
    b.className = "primary";
    b.textContent = action.label;
    b.onclick = action.run;
    box.append(b);
  }
  show("status");
}

const signIn = () =>
  say("sign in to wardrobe first — then click ✦ again", {
    label: "sign in",
    run: () => openTab(`${SERVER}/studio`),
  });

// Load a shop photo straight from the shop; if it hotlink-blocks us, go through
// the wardrobe proxy; if that fails too, give up on the photo.
function loadInto(img, url, onFail) {
  img.onerror = () => {
    img.onerror = onFail;
    img.src = proxied(url);
  };
  img.src = url;
}

// ---- reading the product ---------------------------------------------------

async function readTab(tab) {
  if (!/^https?:/.test(tab?.url ?? "")) return null;
  await chrome.scripting.executeScript({ target: { tabId: tab.id }, files: ["extract.js"] });
  const [{ result }] = await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    func: () => globalThis.__wardrobeExtract(),
  });
  return result;
}

// the server-side reader, for links rather than open pages
async function scrape(url) {
  const res = await api("/api/scrape", { method: "POST", body: JSON.stringify({ url }) });
  return {
    url: res.sourceUrl || url,
    title: res.title,
    brand: res.brand,
    price: res.price,
    currency: res.currency,
    images: res.imageUrl ? [res.imageUrl] : [],
    blocked: res.shop,
  };
}

// ---- photos -----------------------------------------------------------------

const hues = new Map();

// same dominant-hue sampling as src/lib/color.ts; the proxy sends
// access-control-allow-origin, so the canvas isn't tainted
function hueOf(url) {
  if (hues.has(url)) return hues.get(url);
  const p = new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      try {
        const size = 24;
        const canvas = new OffscreenCanvas(size, size);
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, size, size);
        const { data } = ctx.getImageData(0, 0, size, size);
        let r = 0, g = 0, b = 0, n = 0;
        for (let i = 0; i < data.length; i += 4) {
          if (data[i + 3] < 128) continue;
          const max = Math.max(data[i], data[i + 1], data[i + 2]);
          const min = Math.min(data[i], data[i + 1], data[i + 2]);
          if (max === 0 || (max - min) / max < 0.12) continue;
          r += data[i]; g += data[i + 1]; b += data[i + 2]; n++;
        }
        resolve(n ? rgbToHue(r / n, g / n, b / n) : 0);
      } catch {
        resolve(0);
      }
    };
    img.onerror = () => resolve(0);
    setTimeout(() => resolve(0), 4000);
    img.src = proxied(url);
  });
  hues.set(url, p);
  return p;
}

function rgbToHue(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b), d = max - min;
  if (d === 0) return 0;
  let h = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  h = Math.round(h * 60);
  return h < 0 ? h + 360 : h;
}

function dropImage(url) {
  const i = state.images.indexOf(url);
  if (i === -1) return;
  state.images.splice(i, 1);
  if (state.index >= i && state.index > 0) state.index--;
  renderPhotos();
}

function renderPhotos() {
  const url = state.images[state.index];
  const none = !url;
  $("note-photo").hidden = !none;
  $("note-photo").textContent = "no photo found here — right-click a photo → add this image to wardrobe";
  if (none) $("preview").removeAttribute("src");
  else if ($("preview").dataset.url !== url) {
    $("preview").dataset.url = url;
    loadInto($("preview"), url, () => dropImage(url));
    hueOf(url); // warm it up so saving is instant
  }

  const strip = $("thumbs");
  if (state.images.length < 2) {
    strip.replaceChildren();
  } else {
    strip.replaceChildren(
      ...state.images.map((src, i) => {
        const b = document.createElement("button");
        b.type = "button";
        b.setAttribute("role", "option");
        b.setAttribute("aria-selected", String(i === state.index));
        b.setAttribute("aria-label", `photo ${i + 1}`);
        b.tabIndex = i === state.index ? 0 : -1;
        const img = document.createElement("img");
        img.alt = "";
        img.loading = "lazy";
        loadInto(img, src, () => dropImage(src));
        b.append(img);
        b.onclick = () => pick(i);
        return b;
      }),
    );
    strip.children[state.index]?.scrollIntoView({ block: "nearest", inline: "nearest" });
  }
  validate();
}

function pick(i) {
  state.index = Math.max(0, Math.min(i, state.images.length - 1));
  renderPhotos();
  saveDraft();
}

$("thumbs").addEventListener("keydown", (e) => {
  const step = { ArrowLeft: -1, ArrowRight: 1 }[e.key];
  if (!step) return;
  e.preventDefault();
  pick(state.index + step);
  $("thumbs").children[state.index]?.focus();
});

// ---- form -------------------------------------------------------------------

function validate() {
  $("save").disabled = !state.images[state.index] || !$("name").value.trim();
}

function setPill(groupId, value) {
  for (const b of $(groupId).querySelectorAll(":scope > button")) {
    b.setAttribute("role", "radio");
    b.classList.toggle("on", b.dataset.v === value);
    b.setAttribute("aria-checked", String(b.dataset.v === value));
  }
}

function setStatus(v) {
  state.status = v;
  setPill("status-pills", v);
  $("bought").hidden = v !== "owned";
  $("price").placeholder = v === "want" ? "target price" : "price";
}

function setSize(v) {
  state.sizeTier = v;
  setPill("size-pills", v);
}

for (const b of $("status-pills").querySelectorAll(":scope > button")) b.onclick = () => { setStatus(b.dataset.v); saveDraft(); };
for (const b of $("size-pills").querySelectorAll(":scope > button")) b.onclick = () => { setSize(b.dataset.v); saveDraft(); };

function fillCurrencies(selected) {
  const known = CURRENCIES.map((c) => c.code);
  const opts = CURRENCIES.map((c) => [c.code, `${c.symbol} ${c.code}`]);
  if (selected && !known.includes(selected)) opts.push([selected, selected]);
  $("currency").replaceChildren(...opts.map(([v, label]) => new Option(label, v)));
  $("currency").value = selected || "USD";
}

$("notes-toggle").onclick = () => {
  $("notes-toggle").hidden = true;
  $("notes").hidden = false;
  $("notes").focus();
};

$("name").addEventListener("input", validate);

// ---- sections ---------------------------------------------------------------

const SECTIONS_KEY = `sections:${SERVER}`;

function renderSections(selected = $("section").value || state.wantSection) {
  $("section").replaceChildren(
    new Option("unsorted", ""),
    ...state.sections.map((s) => new Option(s.icon ? `${s.icon} ${s.name}` : s.name, s.id)),
  );
  if (state.sections.some((s) => s.id === selected)) $("section").value = selected;
}

// /api/sections is the light list; servers that predate it still hand back
// sections inside the full /api/wardrobe payload
async function fetchSections() {
  try {
    return (await api("/api/sections")).sections ?? [];
  } catch (err) {
    if (err.status === 401) throw err;
    return ((await api("/api/wardrobe")).sections ?? []).map(({ id, name, icon }) => ({ id, name, icon }));
  }
}

$("section").addEventListener("change", () => (state.wantSection = ""));

$("section-new").onclick = () => {
  const open = $("section-add").hidden;
  $("section-add").hidden = !open;
  if (open) $("section-name").focus();
};

async function createSection() {
  const name = $("section-name").value.trim();
  if (!name) return;
  $("section-create").disabled = true;
  try {
    const s = await api("/api/sections", { method: "POST", body: JSON.stringify({ name }) });
    state.sections.push({ id: s.id, name: s.name, icon: s.icon });
    chrome.storage.local.set({ [SECTIONS_KEY]: state.sections });
    renderSections(s.id);
    $("section-name").value = "";
    $("section-add").hidden = true;
    saveDraft();
  } catch (err) {
    $("error").textContent = `couldn't add that section (${err.message})`;
  }
  $("section-create").disabled = false;
}
$("section-create").onclick = createSection;
$("section-name").addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    e.preventDefault();
    createSection();
  }
});

// ---- drafts -------------------------------------------------------------------
// the popup closes the moment you click away — keep what was typed, per link,
// until the browser closes

const draftKey = () => `draft:${state.sourceUrl}`;
let draftTimer;

function saveDraft() {
  if (!state.sourceUrl) return;
  clearTimeout(draftTimer);
  draftTimer = setTimeout(() => {
    chrome.storage.session.set({
      [draftKey()]: {
        name: $("name").value,
        brand: $("brand").value,
        price: $("price").value,
        currency: $("currency").value,
        section: $("section").value,
        status: state.status,
        sizeTier: state.sizeTier,
        bought: $("bought").value,
        notes: $("notes").value,
        image: state.images[state.index],
      },
    });
  }, 250);
}
$("form").addEventListener("input", saveDraft);
$("form").addEventListener("change", saveDraft);

function applyDraft(d) {
  for (const k of ["name", "brand", "price", "bought", "notes"]) $(k).value = d[k] ?? "";
  if (d.currency) fillCurrencies(d.currency);
  if (d.section != null) renderSections((state.wantSection = d.section));
  setStatus(d.status ?? "owned");
  setSize(d.sizeTier ?? "medium");
  if (d.notes) $("notes-toggle").click();
  const i = state.images.indexOf(d.image);
  if (i > -1) state.index = i;
}

// ---- duplicates ---------------------------------------------------------------

async function checkDupe() {
  if (!state.sourceUrl) return;
  try {
    const { items } = await api(`/api/items?sourceUrl=${encodeURIComponent(state.sourceUrl)}`);
    if (!items?.length) return;
    const it = items[0];
    $("dupe").textContent = `already in your wardrobe as “${it.name}” (${it.status}) — add it again?`;
    $("dupe").hidden = false;
  } catch {
    /* older server without the lookup — skip the warning */
  }
}

// ---- save / undo --------------------------------------------------------------

async function save() {
  const imageUrl = state.images[state.index];
  const name = $("name").value.trim();
  if (!imageUrl || !name) return;
  $("save").disabled = true;
  $("save").textContent = "adding…";
  $("error").textContent = "";

  const price = parseAmount($("price").value) ?? null;
  const currency = $("currency").value;
  const sectionId = $("section").value || null;
  chrome.storage.local.set({ lastCurrency: currency, lastSection: sectionId ?? "", lastSize: state.sizeTier });

  try {
    const item = await api("/api/items", {
      method: "POST",
      body: JSON.stringify({
        imageUrl,
        cutoutUrl: imageUrl,
        sourceUrl: state.sourceUrl || null,
        name,
        brand: $("brand").value.trim() || null,
        price,
        currency,
        status: state.status,
        boughtAt: state.status === "owned" ? $("bought").value.trim() || null : null,
        targetPrice: state.status === "want" ? price : null,
        notes: $("notes").value.trim() || null,
        sectionId,
        sizeTier: state.sizeTier,
        hue: await hueOf(imageUrl),
        posX: 0.4 + Math.random() * 0.2,
        posY: 0.35 + Math.random() * 0.2,
        rotation: (Math.random() - 0.5) * 24,
        sourceType: "scraped",
      }),
    });
    state.savedId = item.id;
  } catch (err) {
    $("save").textContent = "add ✦";
    validate();
    if (err.status === 401) return signIn();
    $("error").textContent = `couldn't save that item (${err.message}) — try again?`;
    return;
  }

  clearTimeout(draftTimer);
  chrome.storage.session.remove(draftKey());
  $("done-name").textContent = name;
  loadInto($("done-img"), imageUrl, () => $("done-img").removeAttribute("src"));
  show("done");
  $("view").focus();
}

$("form").addEventListener("submit", (e) => {
  e.preventDefault();
  save();
});
// Enter in a field submits; in the note it needs ⌘/ctrl
$("notes").addEventListener("keydown", (e) => {
  if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
    e.preventDefault();
    save();
  }
});

$("undo").onclick = async () => {
  $("undo").disabled = true;
  try {
    await api(`/api/items/${state.savedId}`, { method: "DELETE" });
    state.savedId = null;
    $("save").textContent = "add ✦";
    $("error").textContent = "removed — nothing was added";
    validate();
    show("form");
  } catch (err) {
    $("undo").textContent = `couldn't undo (${err.message})`;
  }
  $("undo").disabled = false;
};
$("view").onclick = () => openTab(`${SERVER}/studio`);
$("open-studio").onclick = (e) => {
  e.preventDefault();
  openTab(`${SERVER}/studio`);
};

// ---- paste-a-link fallback ----------------------------------------------------

$("paste-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const url = $("paste-url").value.trim();
  if (!url) return;
  say("reading that link…");
  try {
    await load(await scrape(url));
  } catch (err) {
    if (err.status === 401) return signIn();
    show("paste");
    $("paste-url").setCustomValidity("couldn't read that link");
    $("paste-url").reportValidity();
  }
});
$("paste-url").addEventListener("input", () => $("paste-url").setCustomValidity(""));

// ---- boot -----------------------------------------------------------------------

async function load(page, extraImage) {
  const prefs = await chrome.storage.local.get(["lastCurrency", "lastSection", "lastSize"]);

  state.sourceUrl = page.url ?? "";
  state.images = [...new Set([extraImage, ...(page.images ?? [])].filter(Boolean))];
  state.index = 0;

  $("name").value = page.title ?? "";
  $("brand").value = page.brand ?? "";
  $("price").value = page.price ? String(page.price) : "";
  fillCurrencies(page.currency || prefs.lastCurrency);
  renderSections((state.wantSection = prefs.lastSection ?? ""));
  setStatus("owned");
  setSize(prefs.lastSize || "medium");

  const draft = (await chrome.storage.session.get(draftKey()))[draftKey()];
  if (draft) applyDraft(draft);
  if (extraImage) state.index = 0; // a right-clicked photo always wins

  if (page.blocked) {
    $("error").textContent = `${page.blocked} hides its photos from link previews — open the product page and click ✦ there`;
  }

  show("form");
  renderPhotos();
  $("name").focus();
  checkDupe();
}

async function main() {
  $("kbd-mod").textContent = /Mac/i.test(navigator.platform) ? "⌘" : "ctrl";
  chrome.action.setBadgeText({ text: "" });

  const [[tab], { pending = {} }, { [SECTIONS_KEY]: sections = [] }] = await Promise.all([
    chrome.tabs.query({ active: true, currentWindow: true }),
    chrome.storage.session.get("pending"),
    chrome.storage.local.get(SECTIONS_KEY),
  ]);
  chrome.storage.session.remove("pending");

  // everything below runs in parallel: sign-in check, sections, reading the page
  const me = api("/api/auth/me");
  const page = (pending.link ? scrape(pending.link) : readTab(tab)).catch(() => null);
  state.sections = sections; // cached list shows instantly; refreshed below
  const fresh = fetchSections().catch(() => null);

  try {
    const { user } = await me;
    if (!user) return signIn();
  } catch {
    return say("can't reach wardrobe right now — check your connection and try again", {
      label: "open wardrobe",
      run: () => openTab(SERVER),
    });
  }

  const product = (await page) ?? (pending.image ? { url: tab?.url, images: [] } : null);
  if (!product) {
    if (/^https?:/.test(tab?.url ?? "")) $("paste-url").value = tab.url;
    show("paste");
    $("paste-url").focus();
  } else {
    await load(product, pending.image);
  }

  const list = await fresh;
  if (list) {
    state.sections = list;
    chrome.storage.local.set({ [SECTIONS_KEY]: list });
    renderSections();
  }
}

main();

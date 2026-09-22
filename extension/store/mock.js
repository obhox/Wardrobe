// Stand-in chrome.* APIs and wardrobe API for previewing the real popup in a
// normal browser tab (store/shot.html). Never shipped: build.mjs only copies
// extension/static.
(() => {
  const scene = new URLSearchParams(parent.location.search).get("scene") || "form";
  const here = new URL("/", parent.location.href).href; // project root, served over http

  const product = {
    url: "https://fieldandfold.example/products/cropped-work-jacket",
    title: "cropped work jacket",
    brand: "field & fold",
    price: 148,
    currency: "USD",
    images: ["jacket", "coat", "scarf", "tshirt", "hat"].map((n) => `${here}public/cutouts/${n}.png`),
  };
  const sections = [
    { id: "s1", name: "outerwear", icon: "🧥" },
    { id: "s2", name: "tops", icon: "👕" },
    { id: "s3", name: "accessories", icon: "🧣" },
  ];

  const store = (seed = {}) => ({
    get: async (keys) => {
      if (keys == null) return { ...seed };
      const list = Array.isArray(keys) ? keys : [keys];
      return Object.fromEntries(list.filter((k) => k in seed).map((k) => [k, seed[k]]));
    },
    set: async (obj) => void Object.assign(seed, obj),
    remove: async (k) => void [].concat(k).forEach((key) => delete seed[key]),
  });

  window.chrome = {
    action: { setBadgeText() {}, setBadgeBackgroundColor() {} },
    tabs: {
      query: async () => [{ id: 1, url: scene === "paste" ? "chrome://newtab/" : product.url }],
      create() {},
    },
    scripting: {
      executeScript: async ({ func }) => (func ? [{ result: product }] : [{}]),
    },
    storage: {
      session: store(),
      local: store({ lastSection: "s1", lastCurrency: "USD" }),
    },
    runtime: {},
  };

  const json = (body, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
  const realFetch = window.fetch.bind(window);
  window.fetch = async (input, init = {}) => {
    const url = new URL(typeof input === "string" ? input : input.url);
    if (!url.pathname.startsWith("/api/")) return realFetch(input, init);
    await new Promise((r) => setTimeout(r, 120));
    const method = (init.method || "GET").toUpperCase();
    switch (`${method} ${url.pathname}`) {
      case "GET /api/auth/me":
        return json({ user: scene === "signedout" ? null : { handle: "moth-7" } });
      case "GET /api/sections":
        return json({ sections });
      case "GET /api/items":
        return json({ items: scene === "dupe" ? [{ id: "i1", name: "cropped work jacket", status: "want" }] : [] });
      case "POST /api/items":
        return json({ id: "new-item" });
      case "POST /api/sections":
        return json({ id: "s9", ...JSON.parse(init.body), icon: null });
      default:
        if (method === "DELETE" && url.pathname.startsWith("/api/items/")) return json({ ok: true });
        return json({ error: "not mocked" }, 404);
    }
  };

  if (scene === "done") {
    // press "add ✦" once the form is up
    const t = setInterval(() => {
      const b = document.getElementById("save");
      if (b && !b.disabled && !document.getElementById("form").hidden) {
        clearInterval(t);
        b.click();
      }
    }, 100);
  }
})();

"use client";
import { useState } from "react";
import { motion } from "framer-motion";
import { useStore } from "@/lib/store";
import { api } from "@/lib/api";
import { extractHue } from "@/lib/color";
import type { ItemStatus, SizeTier } from "@/lib/types";
import { SIZE_TIERS } from "@/lib/theme";
import { lastCurrency, rememberCurrency } from "@/lib/currency";
import { downscaleImage } from "@/lib/img";
import { extractUrl, titleFromUrl } from "@/lib/links";
import PriceField, { Chevron } from "./PriceField";

export default function AddItem() {
  const setPanel = useStore((s) => s.setPanel);
  const addItem = useStore((s) => s.addItem);
  const sections = useStore((s) => s.payload?.sections ?? []);

  const [tab, setTab] = useState<"link" | "photo">("link");
  const [url, setUrl] = useState("");
  const [image, setImage] = useState("");
  const [name, setName] = useState("");
  const [brand, setBrand] = useState("");
  const [price, setPrice] = useState("");
  const [currency, setCurrency] = useState(lastCurrency);
  const [status, setStatus] = useState<ItemStatus>("owned");
  const [sectionId, setSectionId] = useState<string>("");
  const [sizeTier, setSizeTier] = useState<SizeTier>("medium");
  const [boughtAt, setBoughtAt] = useState("");
  const [sourceUrl, setSourceUrl] = useState("");
  const [scraping, setScraping] = useState(false);
  const [scrapeMsg, setScrapeMsg] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  // a link was read but gave no usable photo — offer an upload right there
  const [needPhoto, setNeedPhoto] = useState(false);

  async function fetchLink() {
    if (!url.trim()) return;
    // share sheets paste "Check this out! https://…" — keep just the link
    const link = extractUrl(url);
    if (!link) {
      setScrapeMsg("that doesn't look like a link — it should start with https://");
      return;
    }
    setScraping(true);
    setScrapeMsg("");
    setNeedPhoto(false);
    setSourceUrl(link);
    try {
      const res = await api.post("/api/scrape", { url: link });
      if (res.title) setName(res.title);
      if (res.brand) setBrand(res.brand);
      if (res.price) setPrice(String(res.price));
      if (res.currency) setCurrency(res.currency);
      if (res.imageUrl) setImage(res.imageUrl);
      if (res.shop) {
        setScrapeMsg(`${res.shop} hides its product details from link previews — add a photo (a screenshot works) and fill in the rest. the link is kept.`);
        setNeedPhoto(true);
      } else if (!res.imageUrl) {
        setScrapeMsg("couldn't get a photo from that link — add one and fill in the details. the link is kept.");
        setNeedPhoto(true);
      }
    } catch {
      setName((n) => n || titleFromUrl(link) || "");
      setScrapeMsg("couldn't read that link — add a photo and the details yourself? the link is kept.");
      setNeedPhoto(true);
    }
    setScraping(false);
  }

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setImage(await downscaleImage(file));
    } catch {
      setSaveError("couldn't open that photo — try another?");
    }
  }

  async function save() {
    if (!image || !name.trim()) return;
    setSaving(true);
    setSaveError("");
    let hue = 0;
    try {
      hue = await extractHue(image);
    } catch {
      /* ignore */
    }
    if (currency.trim()) rememberCurrency(currency.trim());
    const sourceType = tab === "link" && !needPhoto ? "scraped" : "manual";
    try {
      await addItem({
        imageUrl: image,
        cutoutUrl: image,
        sourceUrl: sourceUrl || null,
        name: name.trim(),
        brand: brand.trim() || null,
        price: price ? Number(price) : null,
        currency: currency.trim() || null,
        status,
        boughtAt: status === "owned" ? boughtAt.trim() || null : null,
        targetPrice: status === "want" && price ? Number(price) : null,
        sectionId: sectionId || null,
        sizeTier,
        hue,
        posX: 0.4 + Math.random() * 0.2,
        posY: 0.35 + Math.random() * 0.2,
        rotation: (Math.random() - 0.5) * 24,
        sourceType,
      });
    } catch (err) {
      setSaving(false);
      setSaveError(
        `couldn't save that item${err instanceof Error && err.message ? ` (${err.message})` : ""} — try again?`,
      );
      return;
    }
    if (typeof window !== "undefined" && (window as any).falorb) {
      (window as any).falorb.track("item_added", { status, sourceType });
    }
    setPanel(null);
  }

  return (
    <Overlay onClose={() => setPanel(null)}>
      <h2 className="font-[family-name:var(--font-display)] text-lg lowercase">add an item</h2>

      <div className="mt-3 flex gap-2">
        <Tab on={tab === "link"} onClick={() => setTab("link")}>paste a link</Tab>
        <Tab on={tab === "photo"} onClick={() => setTab("photo")}>upload a photo</Tab>
      </div>

      {tab === "link" ? (
        <div className="mt-3 flex gap-2">
          <input
            autoFocus
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && fetchLink()}
            placeholder="https://…"
            className="flex-1 rounded-lg border border-rule bg-ground/40 px-3 py-2 text-sm outline-none focus:border-ink"
          />
          <button
            onClick={fetchLink}
            disabled={scraping}
            className="rounded-lg bg-ink px-4 text-sm lowercase text-panel disabled:opacity-40"
          >
            {scraping ? "reading…" : "fetch"}
          </button>
        </div>
      ) : (
        <label className="mt-3 flex cursor-pointer items-center justify-center rounded-lg border border-dashed border-rule bg-ground/30 py-6 text-sm lowercase text-ink-soft">
          choose a photo
          <input type="file" accept="image/*" onChange={onFile} className="hidden" />
        </label>
      )}

      {scrapeMsg && <p className="mt-2 text-xs lowercase text-blush">{scrapeMsg}</p>}
      {tab === "link" && needPhoto && (
        <label className="mt-2 flex cursor-pointer items-center justify-center rounded-lg border border-dashed border-rule bg-ground/30 py-4 text-sm lowercase text-ink-soft hover:border-ink">
          {image ? "choose a different photo" : "add a photo"}
          <input type="file" accept="image/*" onChange={onFile} className="hidden" />
        </label>
      )}

      <div className="mt-4 flex flex-col gap-4 sm:flex-row">
        <div className="flex h-28 w-28 shrink-0 items-center justify-center self-center rounded-lg border border-rule bg-ground/30 sm:self-auto">
          {image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={image} alt="" className="max-h-24 max-w-24 object-contain cutout-shadow" />
          ) : (
            <span className="text-xs lowercase text-ink-soft">preview</span>
          )}
        </div>
        <div className="flex flex-1 flex-col gap-2">
          <Inp value={name} onChange={setName} placeholder="name" maxLength={120} />
          <Inp value={brand} onChange={setBrand} placeholder="brand" maxLength={80} />
          <PriceField
            currency={currency}
            onCurrency={setCurrency}
            amount={price}
            onAmount={setPrice}
            placeholder={status === "want" ? "target price" : "price"}
          />
          <div className="relative flex items-center">
            <select
              value={sectionId}
              onChange={(e) => setSectionId(e.target.value)}
              className="w-full cursor-pointer appearance-none rounded-lg border border-rule bg-ground/40 py-2 pl-3 pr-8 text-sm lowercase outline-none focus:border-ink"
            >
              <option value="">unsorted</option>
              {sections.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
            <Chevron />
          </div>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-3">
        <div className="flex gap-1.5">
          <Pill on={status === "owned"} onClick={() => setStatus("owned")}>owned</Pill>
          <Pill on={status === "want"} onClick={() => setStatus("want")}>want</Pill>
        </div>
        <div className="flex gap-1.5">
          {SIZE_TIERS.map((t) => (
            <Pill key={t} on={sizeTier === t} onClick={() => setSizeTier(t)}>{t}</Pill>
          ))}
        </div>
      </div>

      {status === "owned" && (
        <div className="mt-3">
          <Inp value={boughtAt} onChange={setBoughtAt} placeholder="where bought (optional)" />
        </div>
      )}

      {saveError && <p className="mt-4 text-right text-xs lowercase text-blush">{saveError}</p>}

      <div className="mt-5 flex justify-end gap-2">
        <button onClick={() => setPanel(null)} className="rounded-lg border border-rule px-4 py-2 text-sm lowercase">
          cancel
        </button>
        <button
          onClick={save}
          disabled={saving || !image || !name.trim()}
          className="rounded-lg bg-ink px-5 py-2 text-sm lowercase text-panel disabled:opacity-40"
        >
          {saving ? "adding…" : "add ✦"}
        </button>
      </div>
    </Overlay>
  );
}

function Overlay({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <button aria-label="close" onClick={onClose} className="absolute inset-0 bg-black/25" />
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="thin-scroll relative z-10 max-h-[90dvh] w-full max-w-lg overflow-y-auto rounded-2xl border border-rule bg-panel p-5 shadow-[0_24px_60px_var(--shadow)]"
      >
        {children}
      </motion.div>
    </div>
  );
}

function Tab({ on, children, onClick }: { on: boolean; children: React.ReactNode; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={"rounded-full px-3 py-1 text-xs lowercase " + (on ? "bg-ink text-panel" : "border border-rule")}
    >
      {children}
    </button>
  );
}

function Pill({ on, children, onClick }: { on: boolean; children: React.ReactNode; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={"rounded-full px-2.5 py-1 text-xs lowercase " + (on ? "bg-ink text-panel" : "border border-rule hover:bg-ink/5")}
    >
      {children}
    </button>
  );
}

function Inp({
  value,
  onChange,
  placeholder,
  type = "text",
  maxLength,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  type?: string;
  maxLength?: number;
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      maxLength={maxLength}
      className="w-full rounded-lg border border-rule bg-ground/40 px-3 py-2 text-sm lowercase outline-none placeholder:text-ink-soft/60 focus:border-ink"
    />
  );
}

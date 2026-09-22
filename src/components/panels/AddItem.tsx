"use client";
import { useEffect, useRef, useState } from "react";
import { useStore } from "@/lib/store";
import { api } from "@/lib/api";
import { extractHue } from "@/lib/color";
import type { ItemStatus, ScrapeResult, SizeTier } from "@/lib/types";
import { SIZE_TIERS } from "@/lib/theme";
import { lastCurrency, rememberCurrency } from "@/lib/currency";
import { downscaleImage, imageBlob, proxiedSrc, uploadImage } from "@/lib/img";
import { extractUrl, titleFromUrl } from "@/lib/links";
import { cutOut, cutoutLooksGood, preloadCutout } from "@/lib/cutout";
import { track } from "@/lib/analytics";
import Dialog from "@/components/ui/Dialog";
import { Field, Pill, fieldClass } from "@/components/ui/controls";
import PriceField, { Chevron } from "./PriceField";
import Priority from "./Priority";

type Source = { kind: "remote"; url: string } | { kind: "file"; blob: Blob; preview: string };
type CutState = "idle" | "loading" | "cutting" | "done" | "failed" | "rough";

const AUTO_CUT_KEY = "wardrobe:auto-cutout";

function autoCutPref() {
  try {
    return localStorage.getItem(AUTO_CUT_KEY) !== "0";
  } catch {
    return true;
  }
}

export default function AddItem() {
  const setPanel = useStore((s) => s.setPanel);
  const addItem = useStore((s) => s.addItem);
  const toast = useStore((s) => s.toast);
  const sections = useStore((s) => s.payload?.sections);
  const activeSection = useStore((s) => s.activeSection);

  const [tab, setTab] = useState<"link" | "photo">("link");
  const [url, setUrl] = useState("");
  const [source, setSource] = useState<Source | null>(null);
  const [cutout, setCutout] = useState<{ blob: Blob; preview: string } | null>(null);
  const [cutState, setCutState] = useState<CutState>("idle");
  const [cutProgress, setCutProgress] = useState(0);
  const [useCut, setUseCut] = useState(true);
  const [autoCut, setAutoCut] = useState(autoCutPref);

  const [name, setName] = useState("");
  const [brand, setBrand] = useState("");
  const [price, setPrice] = useState("");
  const [target, setTarget] = useState("");
  const [currency, setCurrency] = useState(lastCurrency);
  const [status, setStatus] = useState<ItemStatus>("owned");
  const [sectionId, setSectionId] = useState<string>(
    activeSection && activeSection !== "__unsorted" ? activeSection : ""
  );
  const [sizeTier, setSizeTier] = useState<SizeTier>("medium");
  const [boughtAt, setBoughtAt] = useState("");
  const [purchasedAt, setPurchasedAt] = useState("");
  const [priority, setPriority] = useState<number | null>(null);
  const [notes, setNotes] = useState("");
  const [showNotes, setShowNotes] = useState(false);
  const [sourceUrl, setSourceUrl] = useState("");

  const [scraping, setScraping] = useState(false);
  const [scrapeMsg, setScrapeMsg] = useState("");
  const [needPhoto, setNeedPhoto] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");

  const scrapeSeq = useRef(0);
  const cutSeq = useRef(0);
  const urls = useRef<string[]>([]);

  // warm the background-removal model while the person types
  useEffect(() => {
    if (autoCut) preloadCutout();
  }, [autoCut]);

  // release object URLs on close
  useEffect(() => () => urls.current.forEach((u) => URL.revokeObjectURL(u)), []);

  function objectUrl(b: Blob) {
    const u = URL.createObjectURL(b);
    urls.current.push(u);
    return u;
  }

  const previewSrc =
    cutout && useCut ? cutout.preview : source?.kind === "file" ? source.preview : source ? proxiedSrc(source.url) : "";

  async function runCutout(src: Source) {
    const seq = ++cutSeq.current;
    setCutout(null);
    setCutProgress(0);
    setCutState("loading");
    try {
      const blob = src.kind === "file" ? src.blob : await imageBlob(src.url);
      const out = await cutOut(blob, (stage, f) => {
        if (seq !== cutSeq.current) return;
        setCutState(stage);
        setCutProgress(f);
      });
      if (seq !== cutSeq.current) return;
      const good = await cutoutLooksGood(out);
      setCutout({ blob: out, preview: objectUrl(out) });
      setUseCut(good);
      setCutState(good ? "done" : "rough");
    } catch {
      if (seq === cutSeq.current) {
        setCutState("failed");
        setUseCut(false);
      }
    }
  }

  function chooseSource(src: Source | null) {
    setSource(src);
    cutSeq.current++;
    setCutout(null);
    setCutState("idle");
    if (src && autoCut) runCutout(src);
  }

  async function fetchLink() {
    if (!url.trim()) return;
    const link = extractUrl(url);
    if (!link) {
      setScrapeMsg("that doesn't look like a link — it should start with https://");
      return;
    }
    const seq = ++scrapeSeq.current;
    setScraping(true);
    setScrapeMsg("");
    setNeedPhoto(false);
    // a new link starts clean — nothing left over from the previous one
    setName("");
    setBrand("");
    setPrice("");
    chooseSource(null);
    setSourceUrl(link);
    try {
      const res: ScrapeResult = await api.post("/api/scrape", { url: link });
      if (seq !== scrapeSeq.current) return;
      setName(res.title ?? titleFromUrl(link) ?? "");
      setBrand(res.brand ?? "");
      if (res.price != null) setPrice(String(res.price));
      if (res.currency) setCurrency(res.currency);
      if (res.imageUrl) chooseSource({ kind: "remote", url: res.imageUrl });
      if (res.shop) {
        setScrapeMsg(`${res.shop} hides its product details from link previews — add a photo (a screenshot works). the link is kept.`);
        setNeedPhoto(true);
      } else if (!res.imageUrl) {
        setScrapeMsg("couldn't get a photo from that link — add one and fill in the details. the link is kept.");
        setNeedPhoto(true);
      }
    } catch (e) {
      if (seq !== scrapeSeq.current) return;
      setName((n) => n || titleFromUrl(link) || "");
      setScrapeMsg(`${(e as Error).message || "couldn't read that link"} — add a photo and the details yourself? the link is kept.`);
      setNeedPhoto(true);
    } finally {
      if (seq === scrapeSeq.current) setScraping(false);
    }
  }

  async function onFile(file: File | undefined) {
    if (!file) return;
    if (!file.type.startsWith("image/") || /svg/.test(file.type)) {
      setSaveError("that isn't a photo we can use — try a jpg, png or webp");
      return;
    }
    setSaveError("");
    const blob = await downscaleImage(file);
    chooseSource({ kind: "file", blob, preview: objectUrl(blob) });
    if (!name) setName(file.name.replace(/\.[a-z0-9]+$/i, "").replace(/[-_]+/g, " ").slice(0, 120).toLowerCase());
  }

  async function save() {
    if (!source || !name.trim()) return;
    setSaving(true);
    setSaveError("");
    try {
      const imageUrl = source.kind === "file" ? await uploadImage(source.blob, "original") : source.url;
      const cutoutUrl = cutout && useCut ? await uploadImage(cutout.blob, "cutout") : null;
      const hue = await extractHue(cutout && useCut ? cutout.preview : previewSrc).catch(() => -1);
      if (currency.trim()) rememberCurrency(currency.trim());
      const sourceType = tab === "link" && !needPhoto ? "scraped" : "manual";
      const num = (v: string) => (v.trim() ? Number(v) : null);

      await addItem({
        imageUrl,
        cutoutUrl,
        sourceUrl: sourceUrl || null,
        name: name.trim(),
        brand: brand.trim() || null,
        price: num(price),
        currency: currency.trim() || null,
        status,
        boughtAt: status === "owned" ? boughtAt.trim() || null : null,
        purchasedAt: status === "owned" && purchasedAt ? purchasedAt : null,
        targetPrice: status === "want" ? num(target) : null,
        priority: status === "want" ? priority : null,
        notes: notes.trim() || null,
        sectionId: sectionId || null,
        sizeTier,
        hue,
        posX: 0.35 + Math.random() * 0.3,
        posY: 0.3 + Math.random() * 0.3,
        rotation: Math.round((Math.random() - 0.5) * 24),
        sourceType,
      });
      track("item_added", { status, sourceType, cutout: !!cutoutUrl });
      toast(`added ${name.trim()} ✦`);
      setPanel(null);
    } catch (err) {
      setSaving(false);
      setSaveError(`couldn't save that item${err instanceof Error && err.message ? ` (${err.message})` : ""} — try again?`);
    }
  }

  function toggleAutoCut() {
    const next = !autoCut;
    setAutoCut(next);
    try {
      localStorage.setItem(AUTO_CUT_KEY, next ? "1" : "0");
    } catch {}
    if (next && source && !cutout) runCutout(source);
  }

  const cutLabel: Record<CutState, string> = {
    idle: "",
    loading: cutProgress > 0 && cutProgress < 1 ? `getting the scissors… ${Math.round(cutProgress * 100)}%` : "getting the scissors…",
    cutting: "cutting it out…",
    done: "cut out ✦",
    rough: "the cutout looks rough — using the original",
    failed: "couldn't cut this one out — using the original",
  };

  return (
    <Dialog title="add an item" onClose={() => setPanel(null)} className="max-w-xl" labelledBy="add-title">
      <h2 id="add-title" className="font-[family-name:var(--font-display)] text-lg lowercase">
        add an item
      </h2>

      <div className="mt-3 flex gap-2" role="tablist" aria-label="how to add">
        <Pill on={tab === "link"} onClick={() => setTab("link")}>paste a link</Pill>
        <Pill on={tab === "photo"} onClick={() => setTab("photo")}>upload a photo</Pill>
      </div>

      {tab === "link" ? (
        <form
          className="mt-3 flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            fetchLink();
          }}
        >
          <label htmlFor="add-url" className="sr-only">product link</label>
          <input
            id="add-url"
            data-autofocus
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onPaste={(e) => {
              const text = e.clipboardData.getData("text");
              if (extractUrl(text)) setTimeout(fetchLink, 0);
            }}
            placeholder="https://…"
            inputMode="url"
            className={`${fieldClass} flex-1 normal-case`}
          />
          <button
            type="submit"
            disabled={scraping || !url.trim()}
            className="rounded-lg bg-ink px-4 text-sm lowercase text-panel disabled:opacity-40"
          >
            {scraping ? "reading…" : "fetch"}
          </button>
        </form>
      ) : (
        <DropZone onFile={onFile} label={source ? "choose a different photo" : "choose or drop a photo"} autoFocus />
      )}

      {scrapeMsg && <p className="mt-2 text-xs lowercase text-blush" role="status">{scrapeMsg}</p>}
      {tab === "link" && needPhoto && <DropZone onFile={onFile} label={source ? "choose a different photo" : "add a photo"} compact />}

      <div className="mt-4 flex flex-col gap-4 sm:flex-row">
        {/* preview: the object materialises (brief §19) */}
        <div className="flex shrink-0 flex-col items-center gap-2 self-center sm:self-start">
          <div
            className={
              "relative flex h-36 w-36 items-center justify-center overflow-hidden rounded-xl border border-rule " +
              (cutout && useCut ? "checker" : "bg-ground/30")
            }
          >
            {scraping && !source ? (
              <div className="shimmer h-24 w-24 rounded-2xl" aria-label="reading the link" />
            ) : source ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={previewSrc}
                alt="preview"
                className={
                  "max-h-32 max-w-32 object-contain transition " +
                  (cutState === "loading" || cutState === "cutting" ? "opacity-60 blur-[1px]" : "cutout-shadow")
                }
              />
            ) : (
              <span className="text-xs lowercase text-ink-soft">preview</span>
            )}
            {(cutState === "loading" || cutState === "cutting") && <div className="scan absolute inset-0" aria-hidden />}
          </div>
          {source && (
            <div className="flex flex-col items-center gap-1 text-[11px] lowercase text-ink-soft" aria-live="polite">
              {cutState !== "idle" && <span>{cutLabel[cutState]}</span>}
              {cutout && (
                <div className="flex gap-1">
                  <Pill on={useCut} onClick={() => setUseCut(true)}>cutout</Pill>
                  <Pill on={!useCut} onClick={() => setUseCut(false)}>original</Pill>
                </div>
              )}
              {(cutState === "failed" || cutState === "rough" || cutState === "done") && (
                <button onClick={() => runCutout(source)} className="underline underline-offset-4 hover:text-ink">
                  try again
                </button>
              )}
              {cutState === "idle" && (
                <button onClick={() => runCutout(source)} className="underline underline-offset-4 hover:text-ink">
                  cut out the background
                </button>
              )}
            </div>
          )}
        </div>

        <div className="flex flex-1 flex-col gap-2">
          <Field aria-label="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="name" maxLength={120} />
          <Field aria-label="brand" value={brand} onChange={(e) => setBrand(e.target.value)} placeholder="brand" maxLength={80} />
          <PriceField
            currency={currency}
            onCurrency={setCurrency}
            amount={price}
            onAmount={setPrice}
            placeholder={status === "want" ? "current price" : "price paid"}
          />
          {status === "want" && (
            <PriceField currency={currency} lockCurrency amount={target} onAmount={setTarget} placeholder="target price (alerts you)" />
          )}
          <div className="relative flex items-center">
            <label htmlFor="add-section" className="sr-only">section</label>
            <select
              id="add-section"
              value={sectionId}
              onChange={(e) => setSectionId(e.target.value)}
              className={`${fieldClass} cursor-pointer appearance-none pr-8`}
            >
              <option value="">unsorted</option>
              {(sections ?? []).map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
            <Chevron />
          </div>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-3">
        <div className="flex gap-1.5" role="group" aria-label="status">
          <Pill on={status === "owned"} onClick={() => setStatus("owned")}>owned</Pill>
          <Pill on={status === "want"} onClick={() => setStatus("want")}>want</Pill>
        </div>
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="size on the canvas">
          {SIZE_TIERS.map((t) => (
            <Pill key={t} on={sizeTier === t} onClick={() => setSizeTier(t)}>{t}</Pill>
          ))}
        </div>
      </div>

      {status === "owned" ? (
        <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-[1fr_auto]">
          <Field aria-label="where bought" value={boughtAt} onChange={(e) => setBoughtAt(e.target.value)} placeholder="where bought (optional)" maxLength={120} />
          <input
            type="date"
            aria-label="purchase date"
            value={purchasedAt}
            max={new Date().toISOString().slice(0, 10)}
            onChange={(e) => setPurchasedAt(e.target.value)}
            className={`${fieldClass} sm:w-40`}
          />
        </div>
      ) : (
        <div className="mt-3 flex items-center gap-3 text-xs lowercase text-ink-soft">
          how much do you want it? <Priority value={priority} onChange={setPriority} />
        </div>
      )}

      {showNotes ? (
        <textarea
          aria-label="notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
          maxLength={2000}
          placeholder="a note…"
          className={`${fieldClass} mt-3 resize-none`}
        />
      ) : (
        <button onClick={() => setShowNotes(true)} className="mt-3 text-xs lowercase text-ink-soft underline underline-offset-4">
          + add a note
        </button>
      )}

      {saveError && <p className="mt-4 text-right text-xs lowercase text-blush" role="alert">{saveError}</p>}

      <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
        <label className="flex cursor-pointer items-center gap-2 text-[11px] lowercase text-ink-soft">
          <input type="checkbox" checked={autoCut} onChange={toggleAutoCut} className="accent-current" />
          cut out backgrounds automatically
        </label>
        <div className="flex gap-2">
          <button onClick={() => setPanel(null)} className="rounded-lg border border-rule px-4 py-2 text-sm lowercase">
            cancel
          </button>
          <button
            onClick={save}
            disabled={saving || !source || !name.trim() || cutState === "loading" || cutState === "cutting"}
            className="rounded-lg bg-ink px-5 py-2 text-sm lowercase text-panel disabled:opacity-40"
          >
            {saving ? "adding…" : "add ✦"}
          </button>
        </div>
      </div>
    </Dialog>
  );
}

function DropZone({
  onFile,
  label,
  compact,
  autoFocus,
}: {
  onFile: (f: File | undefined) => void;
  label: string;
  compact?: boolean;
  autoFocus?: boolean;
}) {
  const [over, setOver] = useState(false);
  return (
    <label
      onDragOver={(e) => {
        e.preventDefault();
        setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setOver(false);
        onFile(e.dataTransfer.files?.[0]);
      }}
      className={
        "mt-3 flex cursor-pointer items-center justify-center rounded-lg border border-dashed bg-ground/30 text-sm lowercase text-ink-soft transition focus-within:border-ink hover:border-ink " +
        (compact ? "py-4 " : "py-7 ") +
        (over ? "border-ink bg-ground/50" : "border-rule")
      }
    >
      {label}
      <input
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif,image/avif"
        data-autofocus={autoFocus ? "" : undefined}
        onChange={(e) => onFile(e.target.files?.[0])}
        className="sr-only"
      />
    </label>
  );
}

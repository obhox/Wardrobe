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
import { cx } from "@/lib/cx";
import Dialog from "@/components/ui/Dialog";
import { Button } from "@/components/ui/Button";
import { Chip } from "@/components/ui/Chip";
import { FormField, Input, Select, Textarea } from "@/components/ui/Field";
import { Segmented } from "@/components/ui/Segmented";
import PriceField from "./PriceField";
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
      setScrapeMsg("That doesn't look like a link. It should start with https://");
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
        setScrapeMsg(`${res.shop} hides its product details from link previews. Add a photo (a screenshot works); the link is kept.`);
        setNeedPhoto(true);
      } else if (!res.imageUrl) {
        setScrapeMsg("Couldn't get a photo from that link. Add one and fill in the details; the link is kept.");
        setNeedPhoto(true);
      }
    } catch (e) {
      if (seq !== scrapeSeq.current) return;
      setName((n) => n || titleFromUrl(link) || "");
      setScrapeMsg(`${(e as Error).message || "Couldn't read that link"}. Add a photo and the details yourself; the link is kept.`);
      setNeedPhoto(true);
    } finally {
      if (seq === scrapeSeq.current) setScraping(false);
    }
  }

  async function onFile(file: File | undefined) {
    if (!file) return;
    if (!file.type.startsWith("image/") || /svg/.test(file.type)) {
      setSaveError("That isn't a photo we can use. Try a JPG, PNG or WebP.");
      return;
    }
    setSaveError("");
    const blob = await downscaleImage(file);
    chooseSource({ kind: "file", blob, preview: objectUrl(blob) });
    if (!name) setName(file.name.replace(/\.[a-z0-9]+$/i, "").replace(/[-_]+/g, " ").slice(0, 120));
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
      toast(`Added ${name.trim()}`);
      setPanel(null);
    } catch (err) {
      setSaving(false);
      setSaveError(`Couldn't save that item${err instanceof Error && err.message ? ` (${err.message})` : ""}. Try again?`);
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
    loading: cutProgress > 0 && cutProgress < 1 ? `Getting ready… ${Math.round(cutProgress * 100)}%` : "Getting ready…",
    cutting: "Cutting it out…",
    done: "Background removed",
    rough: "The cutout looks rough, so we kept the original",
    failed: "Couldn't cut this one out, so we kept the original",
  };

  const cutting = cutState === "loading" || cutState === "cutting";

  return (
    <Dialog title="Add an item" onClose={() => setPanel(null)} className="sm:max-w-xl">
      <Segmented
        label="How to add"
        value={tab}
        onChange={setTab}
        options={[
          { value: "link", label: "Paste a link" },
          { value: "photo", label: "Upload a photo" },
        ]}
        className="flex w-full"
      />

      {tab === "link" ? (
        <form
          className="mt-3 flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            fetchLink();
          }}
        >
          <label htmlFor="add-url" className="sr-only">
            Product link
          </label>
          <Input
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
            className="flex-1"
          />
          <Button type="submit" variant="primary" disabled={scraping || !url.trim()}>
            {scraping ? "Reading…" : "Fetch"}
          </Button>
        </form>
      ) : (
        <DropZone onFile={onFile} label={source ? "Choose a different photo" : "Choose or drop a photo"} autoFocus />
      )}

      {scrapeMsg && (
        <p className="cap-first mt-2 text-caption text-warning" role="status">
          {scrapeMsg}
        </p>
      )}
      {tab === "link" && needPhoto && <DropZone onFile={onFile} label={source ? "Choose a different photo" : "Add a photo"} compact />}

      <div className="mt-5 flex flex-col gap-5 sm:flex-row">
        {/* preview: the object materialises (brief §19) */}
        <div className="flex shrink-0 flex-col items-center gap-2 sm:w-40">
          <div
            className={cx(
              "relative flex aspect-[4/5] w-40 items-center justify-center overflow-hidden rounded-card",
              cutout && useCut ? "checker" : "bg-wash"
            )}
          >
            {scraping && !source ? (
              <div className="shimmer h-24 w-24 rounded-card" aria-label="Reading the link" />
            ) : source ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={previewSrc}
                alt="Preview of the item"
                className={cx("max-h-[84%] max-w-[84%] object-contain transition", cutting ? "opacity-60 blur-[1px]" : "cutout-shadow")}
              />
            ) : (
              <span className="text-caption text-ink-faint">Preview</span>
            )}
            {cutting && <div className="scan absolute inset-0" aria-hidden />}
          </div>
          {source && (
            <div className="flex flex-col items-center gap-1.5 text-center text-caption text-ink-soft" aria-live="polite">
              {cutState !== "idle" && <span>{cutLabel[cutState]}</span>}
              {cutout && (
                <Segmented
                  label="Which picture to use"
                  value={useCut ? "cut" : "original"}
                  onChange={(v) => setUseCut(v === "cut")}
                  options={[
                    { value: "cut", label: "Cutout" },
                    { value: "original", label: "Original" },
                  ]}
                />
              )}
              {(cutState === "failed" || cutState === "rough" || cutState === "done") && (
                <button onClick={() => runCutout(source)} className="underline underline-offset-4 hover:text-ink">
                  Try again
                </button>
              )}
              {cutState === "idle" && (
                <button onClick={() => runCutout(source)} className="underline underline-offset-4 hover:text-ink">
                  Remove the background
                </button>
              )}
            </div>
          )}
        </div>

        <div className="grid flex-1 grid-cols-2 content-start gap-3">
          <FormField label="Name" htmlFor="add-name" className="col-span-2">
            <Input id="add-name" value={name} onChange={(e) => setName(e.target.value)} maxLength={120} />
          </FormField>
          <FormField label="Brand" htmlFor="add-brand" className="col-span-2 sm:col-span-1">
            <Input id="add-brand" value={brand} onChange={(e) => setBrand(e.target.value)} maxLength={80} />
          </FormField>
          <FormField label="Section" htmlFor="add-section" className="col-span-2 sm:col-span-1">
            <Select id="add-section" value={sectionId} onChange={(e) => setSectionId(e.target.value)}>
              <option value="">Unsorted</option>
              {(sections ?? []).map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </Select>
          </FormField>
          <FormField
            label={status === "want" ? "Current price" : "Price paid"}
            htmlFor="add-price"
            className={status === "want" ? "col-span-2 sm:col-span-1" : "col-span-2"}
          >
            <PriceField
              id="add-price"
              label={status === "want" ? "Current price" : "Price paid"}
              currency={currency}
              onCurrency={setCurrency}
              amount={price}
              onAmount={setPrice}
            />
          </FormField>
          {status === "want" && (
            <FormField label="Target price" htmlFor="add-target" className="col-span-2 sm:col-span-1">
              <PriceField id="add-target" label="Target price" currency={currency} lockCurrency amount={target} onAmount={setTarget} />
            </FormField>
          )}
        </div>
      </div>

      <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <FormField label="Status">
          <Segmented
            label="Status"
            value={status}
            onChange={setStatus}
            options={[
              { value: "owned", label: "Owned" },
              { value: "want", label: "Want" },
            ]}
            className="flex w-full"
          />
        </FormField>
        <FormField label="Size in the collage">
          <div className="flex flex-wrap gap-1.5" role="group" aria-label="Size in the collage">
            {SIZE_TIERS.map((t) => (
              <Chip key={t} on={sizeTier === t} onClick={() => setSizeTier(t)} className="capitalize">
                {t}
              </Chip>
            ))}
          </div>
        </FormField>
      </div>

      {status === "owned" ? (
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-[1fr_11rem]">
          <FormField label="Where you bought it" htmlFor="add-bought">
            <Input id="add-bought" value={boughtAt} onChange={(e) => setBoughtAt(e.target.value)} placeholder="Optional" maxLength={120} />
          </FormField>
          <FormField label="Purchase date" htmlFor="add-date">
            <Input
              id="add-date"
              type="date"
              value={purchasedAt}
              max={new Date().toISOString().slice(0, 10)}
              onChange={(e) => setPurchasedAt(e.target.value)}
            />
          </FormField>
        </div>
      ) : (
        <FormField label="How much you want it" className="mt-4">
          <Priority value={priority} onChange={setPriority} />
        </FormField>
      )}

      {showNotes ? (
        <FormField label="Note" htmlFor="add-notes" className="mt-4">
          <Textarea id="add-notes" value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} maxLength={2000} />
        </FormField>
      ) : (
        <button onClick={() => setShowNotes(true)} className="mt-4 text-caption text-ink-soft underline underline-offset-4 hover:text-ink">
          Add a note
        </button>
      )}

      {saveError && (
        <p className="cap-first mt-4 text-caption text-danger" role="alert">
          {saveError}
        </p>
      )}

      <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
        <label className="flex cursor-pointer items-center gap-2 text-caption text-ink-soft">
          <input type="checkbox" checked={autoCut} onChange={toggleAutoCut} className="h-4 w-4 accent-[var(--ink)]" />
          Remove backgrounds automatically
        </label>
        <div className="flex gap-2">
          <Button onClick={() => setPanel(null)}>Cancel</Button>
          <Button variant="primary" onClick={save} disabled={saving || !source || !name.trim() || cutting}>
            {saving ? "Adding…" : "Add item"}
          </Button>
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
      className={cx(
        "mt-3 flex cursor-pointer items-center justify-center rounded-control border border-dashed bg-wash text-ink-soft transition focus-within:border-ink hover:border-ink",
        compact ? "py-4" : "py-8",
        over ? "border-ink" : "border-rule-strong"
      )}
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

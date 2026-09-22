"use client";
import { useState } from "react";
import { useStore } from "@/lib/store";
import { captureStage, downloadBlob, shareImage } from "@/lib/screenshot";
import { track } from "@/lib/analytics";
import Dialog, { SheetHeader } from "@/components/ui/Dialog";
import { Group, Toggle } from "@/components/ui/controls";

export default function SharePanel() {
  const setPanel = useStore((s) => s.setPanel);
  const wardrobe = useStore((s) => s.payload?.wardrobe);
  const sections = useStore((s) => s.payload?.sections);
  const setShare = useStore((s) => s.setShare);
  const rotateShare = useStore((s) => s.rotateShare);
  const setShareDetails = useStore((s) => s.setShareDetails);
  const setSectionsShared = useStore((s) => s.setSectionsShared);
  const updateSection = useStore((s) => s.updateSection);

  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [shooting, setShooting] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  if (!wardrobe) return null;
  const close = () => setPanel(null);
  const shared = wardrobe.visibility === "unlisted" && !!wardrobe.shareCode;
  const link = shared && typeof window !== "undefined" ? `${window.location.origin}/w/${wardrobe.shareCode}` : "";

  async function run(fn: () => Promise<void>, fail: string) {
    setBusy(true);
    setNote(null);
    try {
      await fn();
    } catch {
      setNote(fail);
    } finally {
      setBusy(false);
    }
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      setNote("copy failed — select the link and copy it by hand.");
    }
  }

  async function shareLink() {
    if (navigator.share) {
      try {
        await navigator.share({ title: wardrobe!.title, url: link });
      } catch {
        /* dismissed */
      }
    } else copy();
  }

  async function snapshot(mode: "share" | "save") {
    setShooting(true);
    setNote(null);
    try {
      const blob = await captureStage();
      const filename = `${(wardrobe!.title || "wardrobe").replace(/[^a-z0-9]+/gi, "-").toLowerCase()}.png`;
      if (mode === "save" || !(await shareImage(blob, filename, wardrobe!.title))) downloadBlob(blob, filename);
    } catch {
      setNote("couldn't make a screenshot — try again.");
    } finally {
      setShooting(false);
    }
  }

  return (
    <Dialog title="share" variant="sheet" onClose={close} labelledBy="share-title">
      <SheetHeader id="share-title" title="share" onClose={close} />
      <p className="mt-1 text-[11px] lowercase text-ink-soft">sharing is per wardrobe — this is {wardrobe.title}.</p>

      <Group label="share link">
        <Toggle
          on={shared}
          disabled={busy}
          onChange={(v) =>
            run(async () => {
              await setShare(v);
              if (v) track("wardrobe_shared");
            }, "couldn't update sharing — try again.")
          }
          label={shared ? "anyone with the link can peek (read-only)." : "off — this wardrobe is private."}
        />
        {shared && (
          <div className="mt-3 space-y-2">
            <input
              readOnly
              aria-label="share link"
              value={link}
              onFocus={(e) => e.target.select()}
              className="w-full rounded-lg border border-rule bg-ground/40 px-3 py-2 text-base outline-none sm:text-xs"
            />
            <div className="flex gap-2">
              <button onClick={copy} className="flex-1 rounded-full bg-ink px-3 py-2 text-xs lowercase text-panel hover:opacity-90">
                {copied ? "copied ✦" : "copy link"}
              </button>
              <button onClick={shareLink} className="flex-1 rounded-full border border-rule px-3 py-2 text-xs lowercase hover:bg-ink/5">
                share…
              </button>
            </div>
            <button
              disabled={busy}
              onClick={() => run(rotateShare, "couldn't make a new link — try again.")}
              className="text-[11px] lowercase text-ink-soft underline underline-offset-4 hover:text-ink disabled:opacity-40"
            >
              make a new link (the old one stops working)
            </button>
          </div>
        )}
      </Group>

      {shared && (
        <Group label="show item details">
          <Toggle
            on={!!wardrobe.shareDetails}
            onChange={(v) => setShareDetails(v)}
            label={wardrobe.shareDetails ? "viewers can tap items to see name, brand & price." : "off — viewers only see the pictures."}
          />
        </Group>
      )}

      {shared && sections && sections.length > 0 && (
        <Group label="sections to include">
          <div className="mb-2 flex gap-2">
            <button onClick={() => setSectionsShared(true)} className="rounded-full border border-rule px-2.5 py-1 text-[11px] lowercase hover:bg-ink/5">
              everything
            </button>
            <button onClick={() => setSectionsShared(false)} className="rounded-full border border-rule px-2.5 py-1 text-[11px] lowercase hover:bg-ink/5">
              none
            </button>
          </div>
          <div className="space-y-1.5">
            {sections.map((s) => (
              <Toggle
                key={s.id}
                on={s.shared !== false}
                onChange={(v) => updateSection(s.id, { shared: v })}
                label={`${s.name}${s.count ? ` · ${s.count}` : ""}`}
              />
            ))}
          </div>
          <p className="mt-2 text-[11px] lowercase text-ink-soft">unsorted items are always visible while sharing is on.</p>
        </Group>
      )}

      <Group label="screenshot">
        <p className="mb-2 text-xs lowercase text-ink-soft">snap the canvas as an image to share or save.</p>
        <div className="flex gap-2">
          <button
            onClick={() => snapshot("share")}
            disabled={shooting}
            className="flex-1 rounded-full bg-ink px-3 py-2 text-xs lowercase text-panel hover:opacity-90 disabled:opacity-50"
          >
            {shooting ? "snapping…" : "share image"}
          </button>
          <button
            onClick={() => snapshot("save")}
            disabled={shooting}
            className="flex-1 rounded-full border border-rule px-3 py-2 text-xs lowercase hover:bg-ink/5 disabled:opacity-50"
          >
            save .png
          </button>
        </div>
      </Group>

      {note && <p className="mt-4 text-xs lowercase text-blush" role="alert">{note}</p>}
    </Dialog>
  );
}

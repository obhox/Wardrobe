"use client";
import { useState } from "react";
import { useStore } from "@/lib/store";
import { captureStage, downloadBlob, shareImage } from "@/lib/screenshot";
import { track } from "@/lib/analytics";
import Dialog from "@/components/ui/Dialog";
import { Button } from "@/components/ui/Button";
import { FormField, Input } from "@/components/ui/Field";
import { Switch } from "@/components/ui/Switch";

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
      setNote("Copying failed. Select the link and copy it by hand.");
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
      setNote("Couldn't make a picture of the canvas. Try again.");
    } finally {
      setShooting(false);
    }
  }

  return (
    <Dialog title="Share" variant="sheet" onClose={close}>
      <p className="text-caption text-ink-soft">
        Sharing is set for each wardrobe. This is <span className="cap-first inline-block font-medium text-ink">{wardrobe.title}</span>.
      </p>

      <FormField label="Share link" className="mt-6">
        <Switch
          on={shared}
          disabled={busy}
          onChange={(v) =>
            run(async () => {
              await setShare(v);
              if (v) track("wardrobe_shared");
            }, "Couldn't update sharing. Try again.")
          }
          label={shared ? "Anyone with the link can look, but not change anything." : "Off. This wardrobe is private."}
        />
        {shared && (
          <div className="mt-3 space-y-2">
            <Input readOnly aria-label="Share link" value={link} onFocus={(e) => e.target.select()} className="font-mono" />
            <div className="flex gap-2">
              <Button variant="primary" className="flex-1" onClick={copy}>
                {copied ? "Copied" : "Copy link"}
              </Button>
              <Button className="flex-1" onClick={shareLink}>
                Share…
              </Button>
            </div>
            <button
              disabled={busy}
              onClick={() => run(rotateShare, "Couldn't make a new link. Try again.")}
              className="text-caption text-ink-soft underline underline-offset-4 hover:text-ink disabled:opacity-40"
            >
              Make a new link (the old one stops working)
            </button>
          </div>
        )}
      </FormField>

      {shared && (
        <FormField label="Item details" className="mt-6">
          <Switch
            on={!!wardrobe.shareDetails}
            onChange={(v) => setShareDetails(v)}
            label={wardrobe.shareDetails ? "Viewers can open an item to see its name, brand and price." : "Off. Viewers only see the pictures."}
          />
        </FormField>
      )}

      {shared && sections && sections.length > 0 && (
        <FormField label="Sections to include" className="mt-6">
          <div className="mb-3 flex gap-2">
            <Button size="sm" onClick={() => setSectionsShared(true)}>
              All
            </Button>
            <Button size="sm" onClick={() => setSectionsShared(false)}>
              None
            </Button>
          </div>
          <div className="space-y-2">
            {sections.map((s) => (
              <Switch
                key={s.id}
                on={s.shared !== false}
                onChange={(v) => updateSection(s.id, { shared: v })}
                label={
                  <>
                    <span className="cap-first inline-block text-ink">{s.name}</span>
                    {s.count ? <span className="label-caps tabular ml-2 text-ink-faint">{s.count}</span> : null}
                  </>
                }
              />
            ))}
          </div>
          <p className="mt-3 text-caption text-ink-soft">Unsorted items always show while sharing is on.</p>
        </FormField>
      )}

      <FormField label="Picture" className="mt-6">
        <p className="mb-2 text-caption text-ink-soft">Save the canvas as an image to share or keep.</p>
        <div className="flex gap-2">
          <Button className="flex-1" onClick={() => snapshot("share")} disabled={shooting}>
            {shooting ? "Working…" : "Share image"}
          </Button>
          <Button className="flex-1" onClick={() => snapshot("save")} disabled={shooting}>
            Save PNG
          </Button>
        </div>
      </FormField>

      {note && (
        <p className="mt-4 text-caption text-danger" role="alert">
          {note}
        </p>
      )}
    </Dialog>
  );
}

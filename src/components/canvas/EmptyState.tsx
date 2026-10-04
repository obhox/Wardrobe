"use client";
import { Plus } from "lucide-react";
import { useStore } from "@/lib/store";
import { Button } from "@/components/ui/Button";

export default function EmptyState() {
  const setPanel = useStore((s) => s.setPanel);
  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-3 px-6 text-center">
      <h2 className="font-display text-heading">Nothing here yet</h2>
      <p className="max-w-xs text-ink-soft">
        Paste a product link or add a photo. We cut out the background and place it here.
      </p>
      <Button variant="primary" size="lg" className="mt-2" onClick={() => setPanel("add")}>
        <Plus aria-hidden className="h-4 w-4" /> Add an item
      </Button>
      {/* a keyboard shortcut is no use on a touch screen */}
      <p className="hidden text-caption text-ink-faint [@media(hover:hover)]:block">
        Or press <kbd className="rounded border border-rule-strong px-1 font-mono text-label">N</kbd> anywhere.
      </p>
    </div>
  );
}

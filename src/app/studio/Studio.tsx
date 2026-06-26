"use client";
import { useEffect, useState } from "react";
import { useStore } from "@/lib/store";
import type { WardrobePayload } from "@/lib/types";
import { PATTERN_CLASS } from "@/lib/theme";
import Sidebar from "@/components/directory/Sidebar";
import Canvas from "@/components/canvas/Canvas";
import OwnerControls from "@/components/canvas/OwnerControls";
import AddItem from "@/components/panels/AddItem";
import ItemDetail from "@/components/panels/ItemDetail";
import ArrangePopover from "@/components/panels/ArrangePopover";
import BeautifyPanel from "@/components/panels/BeautifyPanel";
import SharePanel from "@/components/panels/SharePanel";
import AccountPanel from "@/components/panels/AccountPanel";
import { STAGE_ID } from "@/lib/screenshot";

export default function Studio({ initial }: { initial: WardrobePayload }) {
  const init = useStore((s) => s.init);
  const payload = useStore((s) => s.payload);
  const openPanel = useStore((s) => s.openPanel);
  const selectedId = useStore((s) => s.selectedId);
  const [mobileDir, setMobileDir] = useState(false);

  // hydrate the store from server props exactly once (lazy initializer)
  useState(() => {
    init(initial);
    return true;
  });

  // keep <html data-ground> in sync so tokens re-theme the whole page
  useEffect(() => {
    if (!payload) return;
    document.documentElement.dataset.ground = payload.wardrobe.theme.ground;
  }, [payload]);

  if (!payload) return null;
  const { theme } = payload.wardrobe;

  return (
    <div className="relative flex h-dvh w-full overflow-hidden">
      {/* directory spine */}
      <div
        className={
          "absolute z-30 h-full w-[280px] shrink-0 transition-transform md:static md:translate-x-0 " +
          (mobileDir ? "translate-x-0" : "-translate-x-full")
        }
      >
        <Sidebar onNavigate={() => setMobileDir(false)} />
      </div>

      {/* canvas */}
      <main id={STAGE_ID} className="ground-field relative flex-1 overflow-hidden">
        {/* pattern overlay */}
        {theme.pattern !== "none" && (
          <div
            className={`pointer-events-none absolute inset-0 ${PATTERN_CLASS[theme.pattern]}`}
          />
        )}

        <Canvas />
        <OwnerControls onToggleDir={() => setMobileDir((v) => !v)} />
      </main>

      {/* overlays */}
      {openPanel === "add" && <AddItem />}
      {openPanel === "beautify" && <BeautifyPanel />}
      {openPanel === "share" && <SharePanel />}
      {openPanel === "account" && <AccountPanel />}
      {openPanel === "arrange" && <ArrangePopover />}
      {selectedId && <ItemDetail />}

      {/* mobile scrim */}
      {mobileDir && (
        <button
          aria-label="close directory"
          onClick={() => setMobileDir(false)}
          className="absolute inset-0 z-20 bg-black/20 md:hidden"
        />
      )}
    </div>
  );
}

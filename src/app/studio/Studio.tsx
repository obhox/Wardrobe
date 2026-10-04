"use client";
import { useEffect, useState } from "react";
import { MotionConfig } from "framer-motion";
import { useStore } from "@/lib/store";
import type { WardrobePayload } from "@/lib/types";
import { THEMES } from "@/lib/theme";
import { track, identify } from "@/lib/analytics";
import { useIsDesktop } from "@/lib/hooks";
import Sidebar from "@/components/directory/Sidebar";
import MobileBar from "@/components/directory/MobileBar";
import Canvas from "@/components/canvas/Canvas";
import Toolbar from "@/components/canvas/Toolbar";
import AddItem from "@/components/panels/AddItem";
import ItemDetail from "@/components/panels/ItemDetail";
import ArrangePopover from "@/components/panels/ArrangePopover";
import BeautifyPanel from "@/components/panels/BeautifyPanel";
import SharePanel from "@/components/panels/SharePanel";
import AccountPanel from "@/components/panels/AccountPanel";
import StatsPanel from "@/components/panels/StatsPanel";
import WardrobesPanel from "@/components/panels/WardrobesPanel";
import Toasts from "@/components/ui/Toasts";
import { STAGE_ID } from "@/lib/screenshot";

export interface StudioUser {
  id: string;
  email: string | null;
  handle: string;
  displayCurrency: string;
}

export default function Studio({ initial, user }: { initial: WardrobePayload; user: StudioUser }) {
  const init = useStore((s) => s.init);
  const payload = useStore((s) => s.payload);
  const openPanel = useStore((s) => s.openPanel);
  const selectedId = useStore((s) => s.selectedId);
  const setPanel = useStore((s) => s.setPanel);
  const [drawer, setDrawer] = useState(false);
  const desktop = useIsDesktop();

  // hydrate the store from server props once per wardrobe (Studio is keyed by id)
  useState(() => {
    init(initial);
    return true;
  });

  const theme = payload?.wardrobe.theme;

  // the browser's toolbar colour follows the wardrobe's ground
  useEffect(() => {
    const swatch = THEMES.find((t) => t.id === theme)?.swatch;
    if (swatch) document.querySelector('meta[name="theme-color"]')?.setAttribute("content", swatch);
  }, [theme]);

  useEffect(() => {
    identify(user.id, user.email);
  }, [user.id, user.email]);

  // keyboard: "/" focuses search, "n" adds an item (when not typing)
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const t = e.target as HTMLElement;
      if (e.metaKey || e.ctrlKey || e.altKey || /input|textarea|select/i.test(t.tagName) || t.isContentEditable) return;
      if (useStore.getState().openPanel || useStore.getState().selectedId) return;
      if (e.key === "/") {
        e.preventDefault();
        document.querySelector<HTMLInputElement>("#directory-search")?.focus();
      } else if (e.key === "n") {
        e.preventDefault();
        setPanel("add");
        track("add_opened", { via: "shortcut" });
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [setPanel]);

  if (!payload) return null;

  return (
    <MotionConfig reducedMotion="user">
      <div className="relative flex h-dvh w-full flex-col overflow-hidden md:flex-row">
        {/* mobile: compact top bar with section chips (brief §20: directory on top) */}
        <MobileBar onOpenDirectory={() => setDrawer(true)} />

        {/* directory spine — a drawer on small screens */}
        <div
          // hidden drawers must not be reachable by keyboard / screen readers
          inert={!desktop && !drawer ? true : undefined}
          className={
            "fixed inset-y-0 left-0 z-40 w-[min(320px,88vw)] shrink-0 transition-transform duration-300 md:static md:z-auto md:w-[272px] md:translate-x-0 " +
            (drawer ? "translate-x-0" : "-translate-x-full")
          }
        >
          <Sidebar onNavigate={() => setDrawer(false)} />
        </div>

        <div className="flex min-h-0 min-w-0 flex-1 flex-col">
          <Toolbar />
          {/* the stage: the only part that takes the wardrobe's theme */}
          <main
            id={STAGE_ID}
            data-theme={theme}
            aria-label="Canvas"
            className="ground-field relative min-h-0 flex-1 overflow-hidden md:mb-3 md:mr-3 md:rounded-sheet md:border md:border-rule"
          >
            <Canvas />
          </main>
        </div>

        {openPanel === "add" && <AddItem />}
        {openPanel === "beautify" && <BeautifyPanel />}
        {openPanel === "share" && <SharePanel />}
        {openPanel === "account" && <AccountPanel user={user} />}
        {openPanel === "arrange" && <ArrangePopover />}
        {openPanel === "stats" && <StatsPanel defaultCurrency={user.displayCurrency} />}
        {openPanel === "wardrobes" && <WardrobesPanel />}
        {selectedId && <ItemDetail />}

        {drawer && (
          <button
            aria-label="Close sections"
            onClick={() => setDrawer(false)}
            className="fixed inset-0 z-30 bg-black/30 md:hidden"
          />
        )}
        <Toasts />
      </div>
    </MotionConfig>
  );
}

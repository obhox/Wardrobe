"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { brand } from "@/lib/brand";
import { cx } from "@/lib/cx";
import { TABS, type Tab } from "@/lib/nav";
import { useStore } from "@/lib/store";
import Toasts from "@/components/ui/Toasts";

// The frame around every signed-in screen: the page, with the main tabs along
// the bottom on phones and down the left side from tablet width up.
export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const filter = useStore((s) => s.filter);
  const setFilter = useStore((s) => s.setFilter);
  const setSection = useStore((s) => s.setSection);

  const inStudio = pathname.startsWith("/studio");
  const active: Tab["id"] | null = inStudio ? (filter === "want" ? "wishlist" : "closet") : pathname.startsWith("/you") ? "you" : null;

  // Closet and Wishlist are two views of the open wardrobe, so switching
  // between them in the studio changes the filter instead of loading a page
  function onPick(e: React.MouseEvent, tab: Tab) {
    if (!inStudio || tab.id === "you") return;
    e.preventDefault();
    setSection(null);
    setFilter(tab.id === "wishlist" ? "want" : "all");
  }

  const link = (tab: Tab, className: string) => (
    <Link
      key={tab.id}
      href={tab.href}
      onClick={(e) => onPick(e, tab)}
      aria-current={active === tab.id ? "page" : undefined}
      className={cx(
        "flex flex-col items-center gap-1 text-label transition",
        active === tab.id ? "text-ink" : "text-ink-faint hover:text-ink",
        className
      )}
    >
      <span className={cx("flex h-8 w-12 items-center justify-center rounded-full transition", active === tab.id && "bg-ink/8")}>
        <tab.Icon aria-hidden className="h-5 w-5" strokeWidth={active === tab.id ? 2.2 : 1.8} />
      </span>
      {tab.label}
    </Link>
  );

  return (
    <div className="flex h-dvh w-full flex-col md:flex-row">
      <nav aria-label="Main" className="hidden w-[4.5rem] shrink-0 flex-col items-center gap-3 border-r border-rule pb-4 pt-5 md:flex">
        <Link href="/studio" aria-label={`${brand.name} home`} className="mb-3 font-display text-heading leading-none">
          {brand.mark}
        </Link>
        {TABS.map((t) => link(t, "w-full py-1"))}
      </nav>

      <div className="min-h-0 min-w-0 flex-1 overflow-y-auto">{children}</div>

      <nav
        aria-label="Main"
        className="flex shrink-0 border-t border-rule bg-ground pb-[env(safe-area-inset-bottom)] md:hidden"
      >
        {TABS.map((t) => link(t, "flex-1 pb-1.5 pt-2"))}
      </nav>

      <Toasts />
    </div>
  );
}

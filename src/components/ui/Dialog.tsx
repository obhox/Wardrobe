"use client";
import { useEffect, useId, useRef } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { X } from "lucide-react";
import { cx } from "@/lib/cx";
import { IconButton } from "./Button";

// One accessible overlay for every panel (brief §20): role=dialog, aria-modal,
// Escape closes, focus is trapped inside and returned on close. Every variant
// has a header with a close button, and scrolls inside when it runs long.
//
//   variant="modal"   centred card (add, item detail)
//   variant="sheet"   rail on the right (theme, share, account…)
//   variant="popover" small card under the toolbar (arrange)
//
// On phones all three rise from the bottom and stop short of the top, so the
// page behind stays in view.

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

const PHONE = "absolute inset-x-0 bottom-0 max-h-[88dvh] rounded-t-sheet border-t";

const PANEL = {
  modal: "sm:relative sm:inset-auto sm:max-h-[90dvh] sm:w-full sm:rounded-sheet sm:border",
  sheet:
    "sm:inset-x-auto sm:bottom-auto sm:right-0 sm:top-0 sm:h-full sm:max-h-none sm:w-[380px] sm:rounded-none sm:border-l sm:border-t-0",
  popover:
    "sm:inset-x-auto sm:bottom-auto sm:right-5 sm:top-[4.5rem] sm:max-h-[calc(100dvh-6rem)] sm:w-72 sm:rounded-card sm:border",
};

export default function Dialog({
  title,
  onClose,
  variant = "modal",
  children,
  className = "",
  heading,
  initialFocus = true,
}: {
  /** names the dialog, and is its visible heading unless `heading` is given */
  title: string;
  onClose: () => void;
  variant?: "modal" | "sheet" | "popover";
  children: React.ReactNode;
  className?: string;
  /** shown in place of the title (e.g. a pager); the title still names the dialog */
  heading?: React.ReactNode;
  initialFocus?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  const reduce = useReducedMotion();
  const labelId = useId();

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    const previously = document.activeElement as HTMLElement | null;
    const node = ref.current;
    if (node && initialFocus) {
      // focus a field that asks for it, otherwise the dialog itself — so nothing
      // looks pre-selected and, on phones, no keyboard opens uninvited
      (node.querySelector<HTMLElement>("[autofocus], [data-autofocus]") ?? node).focus({ preventScroll: true });
    }

    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.stopPropagation();
        onCloseRef.current();
        return;
      }
      if (e.key !== "Tab" || !ref.current) return;
      const els = [...ref.current.querySelectorAll<HTMLElement>(FOCUSABLE)].filter(
        (el) => el.offsetParent !== null || el === document.activeElement
      );
      if (!els.length) return;
      const first = els[0];
      const last = els[els.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      previously?.focus?.({ preventScroll: true });
    };
  }, [initialFocus]);

  return (
    <div className={cx("fixed inset-0 z-[60]", variant === "modal" && "sm:flex sm:items-center sm:justify-center sm:p-4")}>
      <div
        aria-hidden
        onClick={onClose}
        className={cx("absolute inset-0 bg-black/30", variant === "popover" && "sm:bg-transparent")}
      />
      <motion.div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelId}
        tabIndex={-1}
        initial={{ opacity: 0, y: reduce ? 0 : 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 380, damping: 34 }}
        className={cx("flex flex-col border-rule bg-panel shadow-overlay outline-none", PHONE, PANEL[variant], className)}
      >
        <div className="flex shrink-0 items-center justify-between gap-3 py-3 pl-5 pr-3 sm:pl-6 sm:pr-4">
          <div className="min-w-0 flex-1">
            {heading}
            <h2 id={labelId} className={heading ? "sr-only" : "cap-first truncate font-display text-title"}>
              {title}
            </h2>
          </div>
          <IconButton label="Close" onClick={onClose}>
            <X aria-hidden className="h-5 w-5" />
          </IconButton>
        </div>
        <div className="thin-scroll min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] sm:px-6 sm:pb-6">
          {children}
        </div>
      </motion.div>
    </div>
  );
}

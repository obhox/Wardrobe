"use client";
import { useEffect, useId, useRef } from "react";
import { motion, useReducedMotion } from "framer-motion";

// One accessible overlay for every panel (brief §20): role=dialog, aria-modal,
// Escape closes, focus is trapped inside and returned on close.
//
//   variant="modal"   centred card (add, item detail)
//   variant="sheet"   slides in from the right (beautify, share, account…)
//   variant="popover" small card anchored bottom-right (arrange)

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export default function Dialog({
  title,
  onClose,
  variant = "modal",
  children,
  className = "",
  labelledBy,
  initialFocus = true,
}: {
  title: string;
  onClose: () => void;
  variant?: "modal" | "sheet" | "popover";
  children: React.ReactNode;
  className?: string;
  labelledBy?: string;
  initialFocus?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  const reduce = useReducedMotion();
  const fallbackId = useId();

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    const previously = document.activeElement as HTMLElement | null;
    const node = ref.current;
    if (node && initialFocus) {
      const auto = node.querySelector<HTMLElement>("[autofocus], [data-autofocus]");
      (auto ?? node.querySelector<HTMLElement>(FOCUSABLE) ?? node).focus({ preventScroll: true });
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

  const labelId = labelledBy ?? fallbackId;

  const motionProps =
    variant === "sheet"
      ? { initial: reduce ? { opacity: 0 } : { x: 360 }, animate: reduce ? { opacity: 1 } : { x: 0 } }
      : { initial: { opacity: 0, scale: reduce ? 1 : 0.96, y: reduce ? 0 : 10 }, animate: { opacity: 1, scale: 1, y: 0 } };

  const panelClass =
    variant === "sheet"
      ? "thin-scroll absolute right-0 top-0 h-full w-full max-w-[360px] overflow-y-auto border-l border-rule bg-panel p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] shadow-[-12px_0_40px_var(--shadow)]"
      : variant === "popover"
        ? "absolute bottom-24 right-3 w-[min(17rem,calc(100vw-1.5rem))] rounded-2xl border border-rule bg-panel p-4 shadow-[0_18px_44px_var(--shadow)] sm:bottom-20 sm:right-5"
        : "thin-scroll relative z-10 max-h-[92dvh] w-full overflow-y-auto rounded-2xl border border-rule bg-panel p-5 shadow-[0_24px_60px_var(--shadow)] sm:p-6";

  return (
    <div
      className={
        "fixed inset-0 z-[60] " + (variant === "modal" ? "flex items-end justify-center p-3 sm:items-center sm:p-4" : "")
      }
    >
      <div
        aria-hidden
        onClick={onClose}
        className={"absolute inset-0 " + (variant === "popover" ? "" : "bg-black/25")}
      />
      <motion.div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelId}
        tabIndex={-1}
        {...motionProps}
        transition={{ type: "spring", stiffness: 320, damping: 32 }}
        className={`${panelClass} outline-none ${className}`}
      >
        {!labelledBy && (
          <span id={labelId} className="sr-only">
            {title}
          </span>
        )}
        {children}
      </motion.div>
    </div>
  );
}

export function SheetHeader({ title, onClose, id }: { title: string; onClose: () => void; id?: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <h2 id={id} className="font-[family-name:var(--font-display)] text-lg lowercase">
        {title}
      </h2>
      <button onClick={onClose} className="rounded px-1 text-sm lowercase text-ink-soft hover:text-ink">
        close ×
      </button>
    </div>
  );
}

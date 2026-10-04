"use client";
import { AnimatePresence, motion } from "framer-motion";
import { CircleAlert, X } from "lucide-react";
import { useStore } from "@/lib/store";
import { cx } from "@/lib/cx";

// Quiet status line at the bottom of the screen: confirmations, errors, undo.
// Messages wrap rather than truncate, so a long one can still be read.
export default function Toasts() {
  const toasts = useStore((s) => s.toasts);
  const dismiss = useStore((s) => s.dismissToast);

  return (
    <div
      data-noshot="true"
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 bottom-[max(1rem,env(safe-area-inset-bottom))] z-[70] flex flex-col items-center gap-2 px-3"
    >
      <AnimatePresence initial={false}>
        {toasts.map((t) => (
          <motion.div
            key={t.id}
            layout
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            role={t.tone === "error" ? "alert" : "status"}
            className={cx(
              "pointer-events-auto flex max-w-[min(30rem,100%)] items-start gap-3 rounded-card border py-2.5 pl-4 pr-2 text-caption shadow-card",
              t.tone === "error" ? "border-danger bg-panel text-ink" : "border-transparent bg-ink text-ground"
            )}
          >
            {t.tone === "error" && <CircleAlert aria-hidden className="mt-0.5 h-4 w-4 shrink-0 text-danger" />}
            <span className="cap-first min-w-0 flex-1 py-0.5">{t.message}</span>
            {t.undo && (
              <button
                onClick={() => {
                  t.undo?.();
                  dismiss(t.id);
                }}
                className="shrink-0 py-0.5 font-medium underline underline-offset-4"
              >
                Undo
              </button>
            )}
            <button
              onClick={() => dismiss(t.id)}
              aria-label="Dismiss"
              className="flex shrink-0 items-center justify-center rounded opacity-70 hover:opacity-100"
            >
              <X aria-hidden className="h-4 w-4" />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

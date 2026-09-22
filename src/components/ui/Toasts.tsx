"use client";
import { AnimatePresence, motion } from "framer-motion";
import { useStore } from "@/lib/store";

// Quiet status line at the bottom of the canvas: confirmations, errors, undo.
export default function Toasts() {
  const toasts = useStore((s) => s.toasts);
  const dismiss = useStore((s) => s.dismissToast);

  return (
    <div
      data-noshot="true"
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 bottom-[max(5.5rem,calc(env(safe-area-inset-bottom)+5rem))] z-[70] flex flex-col items-center gap-2 px-3 sm:bottom-20"
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
            className={
              "pointer-events-auto flex max-w-[min(28rem,100%)] items-center gap-3 rounded-full border px-4 py-2 text-[13px] lowercase shadow-[0_10px_30px_var(--shadow)] " +
              (t.tone === "error" ? "border-blush/60 bg-panel text-ink" : "border-rule bg-ink text-panel")
            }
          >
            {t.tone === "error" && <span aria-hidden className="text-blush">!</span>}
            <span className="min-w-0 truncate">{t.message}</span>
            {t.undo && (
              <button
                onClick={() => {
                  t.undo?.();
                  dismiss(t.id);
                }}
                className="shrink-0 font-medium underline underline-offset-4"
              >
                undo
              </button>
            )}
            <button onClick={() => dismiss(t.id)} aria-label="dismiss" className="shrink-0 opacity-60 hover:opacity-100">
              ×
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

"use client";

// Falorb analytics (loaded async in the root layout). Calls made before the
// script arrives are queued and replayed, so nothing is dropped.

interface Falorb {
  track: (event: string, props?: Record<string, unknown>) => void;
  identify: (id: string, traits?: Record<string, unknown>) => void;
}

declare global {
  interface Window {
    falorb?: Falorb;
  }
}

const queue: ((f: Falorb) => void)[] = [];
let polling = false;

function withFalorb(fn: (f: Falorb) => void) {
  if (typeof window === "undefined") return;
  if (window.falorb) return fn(window.falorb);
  queue.push(fn);
  if (polling) return;
  polling = true;
  let tries = 0;
  const iv = setInterval(() => {
    if (window.falorb || ++tries > 40) {
      clearInterval(iv);
      polling = false;
      const f = window.falorb;
      if (f) queue.splice(0).forEach((q) => q(f));
      else queue.length = 0;
    }
  }, 250);
}

export function track(event: string, props?: Record<string, unknown>) {
  withFalorb((f) => f.track(event, props));
}

export function identify(id: string, email?: string | null) {
  withFalorb((f) => f.identify(id, email ? { email } : undefined));
}

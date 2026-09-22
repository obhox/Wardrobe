"use client";
import { useCallback, useEffect, useRef, useSyncExternalStore } from "react";

export function useMediaQuery(query: string, serverValue = false): boolean {
  const subscribe = useCallback(
    (cb: () => void) => {
      const mq = window.matchMedia(query);
      mq.addEventListener("change", cb);
      return () => mq.removeEventListener("change", cb);
    },
    [query]
  );
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(query).matches,
    () => serverValue
  );
}

export const useIsDesktop = () => useMediaQuery("(min-width: 768px)", true);
export const useIsNarrow = () => useMediaQuery("(max-width: 639px)");
export const useCanHover = () => useMediaQuery("(hover: hover) and (pointer: fine)", true);

/** Debounce a callback; pending calls flush on unmount so edits aren't lost. */
export function useDebounced<A extends unknown[]>(fn: (...args: A) => void, ms = 500) {
  const fnRef = useRef(fn);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pending = useRef<A | null>(null);

  useEffect(() => {
    fnRef.current = fn;
  }, [fn]);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
      if (pending.current) fnRef.current(...pending.current);
    },
    []
  );

  return useCallback(
    (...args: A) => {
      pending.current = args;
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => {
        timer.current = null;
        const a = pending.current;
        pending.current = null;
        if (a) fnRef.current(...a);
      }, ms);
    },
    [ms]
  );
}

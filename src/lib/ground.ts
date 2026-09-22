// Custom "#rrggbb" grounds (brief §17): derive the tuned ink, panel and
// shadow the preset grounds ship with, so any colour stays readable.

import type { Ground } from "./types";

export function isCustomGround(g: string | null | undefined): g is `#${string}` {
  return !!g && /^#[0-9a-f]{6}$/i.test(g);
}

function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function mix(a: [number, number, number], b: [number, number, number], t: number) {
  const c = a.map((v, i) => Math.round(v + (b[i] - v) * t));
  return `rgb(${c[0]}, ${c[1]}, ${c[2]})`;
}

// WCAG relative luminance
export function luminance(hex: string): number {
  const [r, g, b] = hexToRgb(hex).map((v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** CSS custom properties for a custom ground (null for presets). */
export function groundVars(ground: Ground | string | null | undefined): Record<string, string> | null {
  if (!isCustomGround(ground)) return null;
  const rgb = hexToRgb(ground);
  const dark = luminance(ground) < 0.22;
  const white: [number, number, number] = [255, 255, 255];
  const black: [number, number, number] = [0, 0, 0];
  const [r, g, b] = rgb;
  return {
    "--ground": ground,
    "--ground-haze": mix(rgb, white, dark ? 0.08 : 0.3),
    "--ground-dusk": mix(rgb, black, dark ? 0.25 : 0.08),
    "--ink": dark ? "#eef1f8" : "#15171c",
    "--ink-soft": dark ? "#b4bccb" : mix(rgb, black, 0.72),
    "--rule": dark ? "rgba(238, 241, 248, 0.3)" : "rgba(20, 22, 27, 0.42)",
    "--panel": dark ? mix(rgb, white, 0.1) : mix(rgb, white, 0.82),
    "--shadow": dark ? "rgba(0, 0, 0, 0.45)" : `rgba(${Math.round(r * 0.3)}, ${Math.round(g * 0.3)}, ${Math.round(b * 0.35)}, 0.28)`,
    "--shadow-strong": dark ? "rgba(0, 0, 0, 0.6)" : `rgba(${Math.round(r * 0.3)}, ${Math.round(g * 0.3)}, ${Math.round(b * 0.35)}, 0.4)`,
  };
}

/** value for <html data-ground> — custom colours use the "custom" hook */
export function groundAttr(ground: Ground | string): string {
  return isCustomGround(ground) ? "custom" : ground;
}

export function groundSwatch(ground: Ground | string): string {
  const presets: Record<string, string> = {
    daylight: "#a9c4f5",
    bone: "#f3efe6",
    sage: "#d7e0cc",
    butter: "#f6e6b8",
    bubblegum: "#f4d3de",
    slate: "#1f2330",
  };
  return isCustomGround(ground) ? ground : presets[ground] ?? presets.daylight;
}

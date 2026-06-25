"use client";
import { toPng } from "html-to-image";

export const STAGE_ID = "wardrobe-stage";

// Capture the wardrobe canvas (ground + cutouts + stickers) as a PNG blob.
// Nodes flagged with data-noshot (owner controls, scrims) are skipped so the
// shot reads like the read-only guest view. Item images are served same-origin
// via /api/img, so the rendered canvas isn't tainted.
export async function captureStage(): Promise<Blob> {
  const node = document.getElementById(STAGE_ID);
  if (!node) throw new Error("canvas not found");

  const dataUrl = await toPng(node, {
    pixelRatio: 2,
    cacheBust: true,
    // Skip web-font embedding: it walks every stylesheet's cssRules, which
    // throws a SecurityError on cross-origin sheets (Next's injected styles).
    // The canvas is mostly imagery; fonts fall back to system faces in the shot.
    skipFonts: true,
    filter: (el) =>
      !(el instanceof HTMLElement && el.dataset && el.dataset.noshot === "true"),
  });

  const res = await fetch(dataUrl);
  return res.blob();
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  // give the browser a tick to start the download before revoking
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// Native share-sheet for the PNG when the platform supports file sharing
// (mostly mobile); returns false so callers can fall back to a download.
export async function shareImage(blob: Blob, filename: string, title: string): Promise<boolean> {
  const file = new File([blob], filename, { type: "image/png" });
  const nav = navigator as Navigator & {
    canShare?: (data?: ShareData) => boolean;
  };
  if (nav.canShare?.({ files: [file] }) && nav.share) {
    try {
      await nav.share({ files: [file], title });
      return true;
    } catch (err) {
      // user cancelled the sheet — treat as handled, don't fall back to download
      if (err instanceof DOMException && err.name === "AbortError") return true;
    }
  }
  return false;
}

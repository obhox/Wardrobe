"use client";

// Background removal in the browser (brief §15 / §25 decision 6): free,
// private, no per-image cost. The model (~40 MB, cached by the browser after
// the first run) and WASM runtime load lazily, only when someone adds a photo.
//
// NEXT_PUBLIC_IMGLY_PUBLIC_PATH can point at a self-hosted copy of
// @imgly/background-removal-data; by default imgly's CDN is used.

type Progress = (stage: "loading" | "cutting", fraction: number) => void;

let warm: Promise<unknown> | null = null;

async function lib() {
  return import("@imgly/background-removal");
}

function config(onProgress?: Progress) {
  const publicPath = process.env.NEXT_PUBLIC_IMGLY_PUBLIC_PATH;
  return {
    model: "isnet_quint8" as const,
    output: { format: "image/png" as const },
    ...(publicPath ? { publicPath } : {}),
    progress: (key: string, current: number, total: number) => {
      if (!onProgress || !total) return;
      onProgress(key.startsWith("fetch") ? "loading" : "cutting", current / total);
    },
  };
}

/** Start downloading the model early (e.g. when the add panel opens). */
export function preloadCutout() {
  if (typeof window === "undefined" || warm) return;
  warm = lib()
    .then((m) => m.preload(config()))
    .catch(() => {
      warm = null;
    });
}

/** Remove the background; resolves to a transparent PNG blob. */
export async function cutOut(image: Blob, onProgress?: Progress): Promise<Blob> {
  const { removeBackground } = await lib();
  return removeBackground(image, config(onProgress));
}

/**
 * Quick sanity check on a cutout: if almost nothing (or almost everything)
 * survived, the model probably failed — offer the original instead.
 */
export async function cutoutLooksGood(blob: Blob): Promise<boolean> {
  try {
    const bmp = await createImageBitmap(blob);
    const size = 48;
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = size;
    const ctx = canvas.getContext("2d");
    if (!ctx) return true;
    ctx.drawImage(bmp, 0, 0, size, size);
    const { data } = ctx.getImageData(0, 0, size, size);
    let opaque = 0;
    for (let i = 3; i < data.length; i += 4) if (data[i] > 64) opaque++;
    const share = opaque / (size * size);
    return share > 0.04 && share < 0.97;
  } catch {
    return true;
  }
}

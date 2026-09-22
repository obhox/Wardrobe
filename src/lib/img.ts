// Where an item image is loaded from in the browser:
//   - our own bucket, data: and blob: URLs → as-is
//   - anything else (a shop's CDN) → the same-origin /api/img proxy, which
//     keeps screenshots untainted and sidesteps hotlink blocks

let storageBase: string | null = null;

export function setStorageBase(base: string | null | undefined) {
  storageBase = base ? base.replace(/\/+$/, "") : null;
}

export function isStored(url: string | null | undefined): boolean {
  return !!url && !!storageBase && url.startsWith(storageBase + "/");
}

export function proxiedSrc(url: string | null | undefined): string {
  if (!url) return "";
  if (/^(data:|blob:|\/)/i.test(url) || isStored(url)) return url;
  if (/^https?:\/\//i.test(url)) return `/api/img?url=${encodeURIComponent(url)}`;
  return url;
}

// Shrink a photo in the browser before upload (phones produce 5–10 MB files).
// Keeps transparency. The server re-encodes anyway; this just saves bandwidth.
export function downscaleImage(file: Blob, maxSide = 1600): Promise<Blob> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(file); // unknown format — let the server decide
    };
    img.onload = () => {
      URL.revokeObjectURL(url);
      const scale = Math.min(1, maxSide / Math.max(img.width, img.height));
      if (scale === 1 && file.size < 2_500_000) return resolve(file);
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      const ctx = canvas.getContext("2d");
      if (!ctx) return resolve(file);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      canvas.toBlob((b) => resolve(b && b.size < file.size ? b : file), "image/webp", 0.88);
    };
    img.src = url;
  });
}

// Fetch any image reference as a Blob (remote ones via the proxy).
export async function imageBlob(url: string): Promise<Blob> {
  const res = await fetch(proxiedSrc(url), { credentials: "same-origin" });
  if (!res.ok) throw new Error("couldn't load that image");
  return res.blob();
}

export async function uploadImage(blob: Blob, kind: "original" | "cutout" = "original"): Promise<string> {
  const form = new FormData();
  form.append("file", blob, kind === "cutout" ? "cutout.png" : "photo");
  form.append("kind", kind);
  const res = await fetch("/api/upload", { method: "POST", body: form, credentials: "same-origin" });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error || "upload failed");
  return data.url as string;
}

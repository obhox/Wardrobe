// Client-side dominant-hue extraction for "arrange by color" (brief §16).
// Samples the image on a tiny canvas and returns a 0..360 hue.

export async function extractHue(imageUrl: string): Promise<number> {
  if (typeof window === "undefined") return 0;
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      try {
        const size = 24;
        const canvas = document.createElement("canvas");
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext("2d");
        if (!ctx) return resolve(0);
        ctx.drawImage(img, 0, 0, size, size);
        const { data } = ctx.getImageData(0, 0, size, size);

        let r = 0, g = 0, b = 0, n = 0;
        for (let i = 0; i < data.length; i += 4) {
          const alpha = data[i + 3];
          if (alpha < 128) continue; // skip transparent (cutout background)
          const cr = data[i], cg = data[i + 1], cb = data[i + 2];
          const max = Math.max(cr, cg, cb);
          const min = Math.min(cr, cg, cb);
          const sat = max === 0 ? 0 : (max - min) / max;
          if (sat < 0.12) continue; // skip near-grey pixels
          r += cr; g += cg; b += cb; n += 1;
        }
        if (n === 0) return resolve(0);
        resolve(rgbToHue(r / n, g / n, b / n));
      } catch {
        resolve(0); // tainted canvas (CORS) — fall back gracefully
      }
    };
    img.onerror = () => resolve(0);
    img.src = imageUrl;
  });
}

function rgbToHue(r: number, g: number, b: number): number {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const d = max - min;
  if (d === 0) return 0;
  let h = 0;
  if (max === r) h = ((g - b) / d) % 6;
  else if (max === g) h = (b - r) / d + 2;
  else h = (r - g) / d + 4;
  h = Math.round(h * 60);
  return h < 0 ? h + 360 : h;
}

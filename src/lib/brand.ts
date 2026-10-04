// The product's name, mark and home, in one place. brand.json is plain JSON
// because extension/build.mjs reads it too — rename the product there.
import data from "../../brand.json";

export const brand = {
  ...data,
  // "✦ wardrobe" — the mark and name set together
  wordmark: `${data.mark} ${data.name}`,
  // production host without the scheme, for copy like "saved at example.com"
  host: new URL(data.origin).host,
};

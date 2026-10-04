import localFont from "next/font/local";

// Self-hosted (SIL Open Font License, see ./fonts/LICENSE-*.txt) so pages make
// no font requests to a third party and builds never need the network.

// headings: a serif with an optical-size axis, so large titles get finer detail
export const display = localFont({
  src: [
    { path: "./fonts/fraunces-latin-opsz-normal.woff2", style: "normal" },
    { path: "./fonts/fraunces-latin-opsz-italic.woff2", style: "italic" },
  ],
  weight: "100 900",
  variable: "--font-fraunces",
  display: "swap",
});

// the interface
export const sans = localFont({
  src: "./fonts/geist-latin-wght-normal.woff2",
  weight: "100 900",
  variable: "--font-geist",
  display: "swap",
});

// prices and small labels
export const mono = localFont({
  src: "./fonts/geist-mono-latin-wght-normal.woff2",
  weight: "100 900",
  variable: "--font-geist-mono",
  display: "swap",
});

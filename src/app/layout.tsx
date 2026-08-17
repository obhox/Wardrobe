import type { Metadata, Viewport } from "next";
import Script from "next/script";
import "./globals.css";

export const metadata: Metadata = {
  title: "wardrobe",
  description: "your closet, digitized and made beautiful.",
};

export const viewport: Viewport = {
  themeColor: "#a9c4f5",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" data-ground="daylight" className="h-full">
      <head>
        {/* Fonts loaded at runtime (not at build) so offline builds never fail. */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link
          href="https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500&family=Martian+Mono:wght@400;500;600;700&family=Spline+Sans+Mono:wght@400;500;600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-full">
        <Script
          defer
          src="https://a.falorb.com/t.js"
          data-project="prj_6ff2d3be7b181533dffdc12cbb3f372a"
          strategy="afterInteractive"
        />
        {children}
      </body>
    </html>
  );
}

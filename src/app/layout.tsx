import type { Metadata, Viewport } from "next";
import Script from "next/script";
import { brand } from "@/lib/brand";
import { display, mono, sans } from "./fonts";
import "./globals.css";

export const metadata: Metadata = {
  title: brand.name,
  description: brand.tagline,
};

export const viewport: Viewport = {
  themeColor: "#faf9f6",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${display.variable} ${sans.variable} ${mono.variable} h-full`}>
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

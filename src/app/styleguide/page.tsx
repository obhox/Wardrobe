import type { Metadata } from "next";
import { notFound } from "next/navigation";
import StyleGuide from "./StyleGuide";

export const metadata: Metadata = { title: "Style guide", robots: { index: false } };

// The design system on one page, for development only: tokens, the component
// kit and the item tile, to check a change against everything at once.
export default function StyleGuidePage() {
  if (process.env.NODE_ENV === "production") notFound();
  return <StyleGuide />;
}

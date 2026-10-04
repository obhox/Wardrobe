import Link from "next/link";
import { buttonClass } from "@/components/ui/Button";

export default function NotFound() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-3 p-6 text-center">
      <p className="label-caps text-ink-faint">404</p>
      <h1 className="font-display text-display">Nothing hangs here</h1>
      <p className="max-w-xs text-ink-soft">The page you were after has moved, or was never here.</p>
      <Link href="/" className={buttonClass("primary", "lg", "mt-3")}>
        Back to your wardrobe
      </Link>
    </main>
  );
}

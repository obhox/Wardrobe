import Link from "next/link";

export default function NotFound() {
  return (
    <main className="ground-field flex min-h-dvh flex-col items-center justify-center gap-4 p-6 text-center">
      <pre className="font-[family-name:var(--font-display)] text-lg lowercase">
        {`¯\\_(ツ)_/¯`}
      </pre>
      <p className="text-sm lowercase text-ink-soft">nothing hangs here.</p>
      <Link
        href="/"
        className="rounded-xl bg-ink px-5 py-2.5 text-sm lowercase text-panel transition hover:opacity-90"
      >
        back to your wardrobe
      </Link>
    </main>
  );
}

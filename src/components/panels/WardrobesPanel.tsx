"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useStore } from "@/lib/store";
import { api } from "@/lib/api";
import Dialog, { SheetHeader } from "@/components/ui/Dialog";
import { Field, Group, PrimaryButton } from "@/components/ui/controls";

const TEMPLATES = [
  { id: "closet", label: "closet", hint: "tops · bottoms · shoes · bags" },
  { id: "wishlist", label: "wishlist", hint: "soon · someday" },
  { id: "gear", label: "gear", hint: "tech · outdoor · tools" },
  { id: "blank", label: "blank", hint: "no sections" },
];

// Create, reorder, duplicate and delete wardrobes.
export default function WardrobesPanel() {
  const router = useRouter();
  const setPanel = useStore((s) => s.setPanel);
  const flush = useStore((s) => s.flush);
  const current = useStore((s) => s.payload?.wardrobe.id);
  const wardrobes = useStore((s) => s.payload?.wardrobes ?? []);
  const [title, setTitle] = useState("");
  const [template, setTemplate] = useState("closet");
  const [deleting, setDeleting] = useState<string | null>(null);
  const [confirm, setConfirm] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [order, setOrder] = useState(wardrobes.map((w) => w.id));

  const close = () => setPanel(null);
  const byId = new Map(wardrobes.map((w) => [w.id, w]));

  async function go(id: string) {
    await flush();
    setPanel(null);
    router.push(`/studio/${id}`);
    router.refresh();
  }

  async function act(fn: () => Promise<void>) {
    setBusy(true);
    setErr("");
    try {
      await fn();
    } catch (e) {
      setErr((e as Error).message);
    }
    setBusy(false);
  }

  function move(i: number, d: -1 | 1) {
    const next = [...order];
    const j = i + d;
    if (j < 0 || j >= next.length) return;
    [next[i], next[j]] = [next[j], next[i]];
    setOrder(next);
    api.patch("/api/wardrobes", { order: next }).then(() => router.refresh()).catch(() => {});
  }

  return (
    <Dialog title="wardrobes" variant="sheet" onClose={close} labelledBy="wardrobes-title">
      <SheetHeader id="wardrobes-title" title="your wardrobes" onClose={close} />

      <Group label="all of them">
        <ul className="space-y-1.5">
          {order.map((id, i) => {
            const w = byId.get(id);
            if (!w) return null;
            return (
              <li key={id} className="rounded-lg border border-rule px-3 py-2 text-sm lowercase">
                <div className="flex items-center gap-2">
                  <button onClick={() => go(id)} className="min-w-0 flex-1 truncate text-left hover:underline">
                    {w.icon ?? "✦"} {w.title} <span className="text-xs text-ink-soft">· {w.count}</span>
                    {id === current && <span className="text-xs text-ink-soft"> · open</span>}
                  </button>
                  <button disabled={i === 0} onClick={() => move(i, -1)} aria-label={`move ${w.title} up`} className="px-1 text-xs text-ink-soft disabled:opacity-30">↑</button>
                  <button disabled={i === order.length - 1} onClick={() => move(i, 1)} aria-label={`move ${w.title} down`} className="px-1 text-xs text-ink-soft disabled:opacity-30">↓</button>
                </div>
                <div className="mt-1 flex gap-3 text-[11px] text-ink-soft">
                  <button
                    disabled={busy}
                    onClick={() => act(async () => go((await api.post(`/api/wardrobes/${id}/duplicate`)).id))}
                    className="underline underline-offset-4 hover:text-ink"
                  >
                    duplicate look
                  </button>
                  {wardrobes.length > 1 && (
                    <button onClick={() => { setDeleting(id); setConfirm(""); }} className="underline underline-offset-4 hover:text-blush">
                      delete…
                    </button>
                  )}
                </div>
                {deleting === id && (
                  <div className="mt-2 space-y-2">
                    <p className="text-[11px]">deletes {w.count} item{w.count === 1 ? "" : "s"} and their photos. type <b>{w.title}</b> to confirm.</p>
                    <Field aria-label="type the wardrobe name" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
                    <div className="flex gap-2">
                      <button
                        disabled={busy || confirm.trim().toLowerCase() !== w.title.trim().toLowerCase()}
                        onClick={() =>
                          act(async () => {
                            await api.del(`/api/wardrobes/${id}`, { confirm });
                            const next = order.find((o) => o !== id)!;
                            if (id === current) await go(next);
                            else {
                              setOrder(order.filter((o) => o !== id));
                              setDeleting(null);
                              router.refresh();
                            }
                          })
                        }
                        className="flex-1 rounded-lg bg-blush px-3 py-1.5 text-xs text-white disabled:opacity-40"
                      >
                        delete forever
                      </button>
                      <button onClick={() => setDeleting(null)} className="rounded-lg border border-rule px-3 py-1.5 text-xs">keep</button>
                    </div>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      </Group>

      <Group label="make a new one">
        <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="start from">
          {TEMPLATES.map((t) => (
            <button
              key={t.id}
              role="radio"
              aria-checked={template === t.id}
              onClick={() => setTemplate(t.id)}
              className={"rounded-lg border p-2 text-left text-xs lowercase " + (template === t.id ? "border-ink bg-ink/5" : "border-rule hover:bg-ink/5")}
            >
              {t.label}
              <span className="block text-[10px] text-ink-soft">{t.hint}</span>
            </button>
          ))}
        </div>
        <Field aria-label="name" placeholder="name (optional)" value={title} maxLength={60} onChange={(e) => setTitle(e.target.value)} className="mt-2" />
        <PrimaryButton
          disabled={busy}
          onClick={() => act(async () => go((await api.post("/api/wardrobes", { template, title: title.trim() || undefined })).id))}
          className="mt-2 w-full"
        >
          {busy ? "making…" : "make it ✦"}
        </PrimaryButton>
      </Group>
      {err && <p className="mt-4 text-xs lowercase text-blush" role="alert">{err}</p>}
    </Dialog>
  );
}

"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowDown, ArrowUp } from "lucide-react";
import { useStore } from "@/lib/store";
import { api } from "@/lib/api";
import { cx } from "@/lib/cx";
import Dialog from "@/components/ui/Dialog";
import { Button, IconButton } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { FormField, Input } from "@/components/ui/Field";

const TEMPLATES = [
  { id: "closet", label: "Closet", hint: "Tops, bottoms, shoes, bags" },
  { id: "wishlist", label: "Wishlist", hint: "Soon, someday" },
  { id: "gear", label: "Gear", hint: "Tech, outdoor, tools" },
  { id: "blank", label: "Blank", hint: "No sections" },
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

  const link = "underline underline-offset-4 hover:text-ink disabled:opacity-40";

  return (
    <Dialog title="Your wardrobes" variant="sheet" onClose={close}>
      <ul className="space-y-2">
        {order.map((id, i) => {
          const w = byId.get(id);
          if (!w) return null;
          return (
            <li key={id}>
              <Card className="py-2 pl-3.5 pr-2">
                <div className="flex items-center gap-1">
                  <button onClick={() => go(id)} className="flex min-w-0 flex-1 items-baseline gap-2 py-1 text-left hover:underline">
                    <span className="cap-first truncate font-medium">{w.title}</span>
                    <span className="label-caps tabular shrink-0 text-ink-faint">{w.count}</span>
                    {id === current && <span className="label-caps shrink-0 text-ink-faint">Open</span>}
                  </button>
                  <IconButton label={`Move ${w.title} up`} size="sm" disabled={i === 0} onClick={() => move(i, -1)}>
                    <ArrowUp aria-hidden className="h-4 w-4" />
                  </IconButton>
                  <IconButton label={`Move ${w.title} down`} size="sm" disabled={i === order.length - 1} onClick={() => move(i, 1)}>
                    <ArrowDown aria-hidden className="h-4 w-4" />
                  </IconButton>
                </div>
                <div className="flex gap-4 pb-1 text-caption text-ink-soft">
                  <button disabled={busy} onClick={() => act(async () => go((await api.post(`/api/wardrobes/${id}/duplicate`)).id))} className={link}>
                    Duplicate its look
                  </button>
                  {wardrobes.length > 1 && (
                    <button
                      onClick={() => {
                        setDeleting(id);
                        setConfirm("");
                      }}
                      className="underline underline-offset-4 hover:text-danger"
                    >
                      Delete…
                    </button>
                  )}
                </div>
                {deleting === id && (
                  <div className="space-y-2 border-t border-rule py-3 pr-1.5">
                    <p className="text-caption">
                      This deletes {w.count} item{w.count === 1 ? "" : "s"} and their photos. Type <b>{w.title}</b> to confirm.
                    </p>
                    <Input aria-label="Type the wardrobe's name" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
                    <div className="flex gap-2">
                      <Button
                        variant="danger"
                        className="flex-1"
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
                      >
                        Delete for good
                      </Button>
                      <Button onClick={() => setDeleting(null)}>Keep it</Button>
                    </div>
                  </div>
                )}
              </Card>
            </li>
          );
        })}
      </ul>

      <FormField label="Start a new one" className="mt-8">
        <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Start from">
          {TEMPLATES.map((t) => (
            <button
              key={t.id}
              role="radio"
              aria-checked={template === t.id}
              onClick={() => setTemplate(t.id)}
              className={cx(
                "rounded-control border p-2.5 text-left transition",
                template === t.id ? "border-ink bg-wash" : "border-rule hover:border-rule-strong"
              )}
            >
              <span className="block font-medium">{t.label}</span>
              <span className="block text-caption text-ink-soft">{t.hint}</span>
            </button>
          ))}
        </div>
        <Input aria-label="Name" placeholder="Name (optional)" value={title} maxLength={60} onChange={(e) => setTitle(e.target.value)} className="mt-3" />
        <Button
          variant="primary"
          disabled={busy}
          onClick={() => act(async () => go((await api.post("/api/wardrobes", { template, title: title.trim() || undefined })).id))}
          className="mt-3 w-full"
        >
          {busy ? "Creating…" : "Create wardrobe"}
        </Button>
      </FormField>

      {err && (
        <p className="mt-4 text-caption text-danger" role="alert">
          {err}
        </p>
      )}
    </Dialog>
  );
}

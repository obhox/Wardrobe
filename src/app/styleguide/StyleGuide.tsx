"use client";
import { useState } from "react";
import { Plus, Share2, SlidersHorizontal, Trash2 } from "lucide-react";
import { THEMES } from "@/lib/theme";
import { Button, IconButton } from "@/components/ui/Button";
import { Card, Skeleton } from "@/components/ui/Card";
import { Chip, Tag } from "@/components/ui/Chip";
import { FormField, Input, Select, Textarea } from "@/components/ui/Field";
import { Segmented } from "@/components/ui/Segmented";
import { Switch } from "@/components/ui/Switch";
import ItemTile, { type TileItem } from "@/components/item/ItemTile";
import PriceField from "@/components/panels/PriceField";

const SAMPLES: TileItem[] = [
  { name: "Wool overcoat", brand: "COS", price: 290, currency: "USD", status: "want", src: "/cutouts/coat.png", cut: true },
  { name: "Linen dress", brand: "Arket", price: 120, currency: "EUR", status: "owned", src: "/cutouts/dress.png", cut: true },
  { name: "Leather loafers", brand: "G.H. Bass", price: 175, currency: "USD", status: "owned", src: "/cutouts/shoe.png", cut: true },
  { name: "Field watch", brand: "Hamilton", price: 495, currency: "USD", status: "want", src: "/cutouts/watch.png", cut: true },
];

const SWATCHES: [string, string][] = [
  ["ground", "bg-ground"],
  ["panel", "bg-panel"],
  ["wash", "bg-wash"],
  ["ink", "bg-ink"],
  ["ink-soft", "bg-ink-soft"],
  ["ink-faint", "bg-ink-faint"],
  ["danger", "bg-danger"],
  ["success", "bg-success"],
  ["warning", "bg-warning"],
];

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="border-t border-rule py-10">
      <h2 className="label-caps mb-6 text-ink-soft">{title}</h2>
      {children}
    </section>
  );
}

export default function StyleGuide() {
  const [filter, setFilter] = useState("all");
  const [status, setStatus] = useState<"owned" | "want">("owned");
  const [on, setOn] = useState(true);
  const [amount, setAmount] = useState("290");
  const [currency, setCurrency] = useState("USD");

  return (
    <main className="mx-auto max-w-5xl px-4 pb-24 pt-12 sm:px-8">
      <p className="label-caps text-ink-soft">Design system</p>
      <h1 className="mt-2 font-display text-hero">Style guide</h1>
      <p className="mt-4 max-w-xl text-ink-soft">
        A serif for headings, a clean sans for the interface and mono for prices and small labels, on paper-like
        neutrals. A wardrobe&apos;s theme colours only the stage its items sit on.
      </p>

      <Block title="Type">
        <div className="space-y-5">
          <p className="font-display text-display">Autumn capsule</p>
          <p className="font-display text-heading">Everything, arranged just so</p>
          <p className="font-display text-title">Wool overcoat</p>
          <p className="max-w-xl">
            Body, 15px. Paste a product link or add a photo. We cut out the background and place it in your wardrobe.
          </p>
          <p className="text-caption text-ink-soft">Caption, 13px. Checked 4 Oct · lowest seen in 90 days.</p>
          <p className="label-caps text-ink-soft">Label · 24 items</p>
          <p className="price text-title">$1,290.00</p>
        </div>
      </Block>

      <Block title="Colour">
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-5 md:grid-cols-9">
          {SWATCHES.map(([name, cls]) => (
            <div key={name}>
              <div className={`h-14 rounded-control border border-rule ${cls}`} />
              <p className="label-caps mt-1.5 text-ink-soft">{name}</p>
            </div>
          ))}
        </div>
      </Block>

      <Block title="Themes">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {THEMES.map((t, i) => (
            <div key={t.id} data-theme={t.id} className="ground-field rounded-card border border-rule p-3">
              <ItemTile item={SAMPLES[i % SAMPLES.length]} />
              <p className="label-caps mt-3 text-ink-soft">{t.label}</p>
            </div>
          ))}
        </div>
      </Block>

      <Block title="Buttons">
        <div className="flex flex-wrap items-center gap-3">
          <Button variant="primary">
            <Plus aria-hidden className="h-4 w-4" /> Add item
          </Button>
          <Button>Cancel</Button>
          <Button variant="ghost">
            <SlidersHorizontal aria-hidden className="h-4 w-4" /> Arrange
          </Button>
          <Button variant="danger">
            <Trash2 aria-hidden className="h-4 w-4" /> Delete wardrobe
          </Button>
          <Button variant="primary" disabled>
            Disabled
          </Button>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <Button variant="primary" size="sm">Small</Button>
          <Button variant="primary">Medium</Button>
          <Button variant="primary" size="lg">Large</Button>
          <IconButton label="Share">
            <Share2 aria-hidden className="h-5 w-5" />
          </IconButton>
          <IconButton label="Add an item" variant="primary">
            <Plus aria-hidden className="h-5 w-5" />
          </IconButton>
        </div>
      </Block>

      <Block title="Choices">
        <div className="flex flex-wrap items-center gap-2">
          {["all", "owned", "want"].map((f) => (
            <Chip key={f} on={filter === f} onClick={() => setFilter(f)} className="capitalize">
              {f}
            </Chip>
          ))}
          <Tag>Want</Tag>
        </div>
        <div className="mt-5 flex flex-wrap items-center gap-6">
          <Segmented
            label="Status"
            value={status}
            onChange={setStatus}
            options={[
              { value: "owned", label: "Owned" },
              { value: "want", label: "Want" },
            ]}
          />
          <div className="w-64">
            <Switch on={on} onChange={setOn} label="Tell me when the price drops" />
          </div>
        </div>
      </Block>

      <Block title="Fields">
        <div className="grid max-w-2xl grid-cols-1 gap-4 sm:grid-cols-2">
          <FormField label="Name" htmlFor="sg-name">
            <Input id="sg-name" defaultValue="Wool overcoat" />
          </FormField>
          <FormField label="Section" htmlFor="sg-section">
            <Select id="sg-section" defaultValue="tops">
              <option value="tops">Outerwear</option>
              <option value="shoes">Shoes</option>
            </Select>
          </FormField>
          <FormField label="Price paid" htmlFor="sg-price">
            <PriceField id="sg-price" label="Price paid" currency={currency} onCurrency={setCurrency} amount={amount} onAmount={setAmount} />
          </FormField>
          <FormField label="Brand" htmlFor="sg-brand">
            <Input id="sg-brand" placeholder="Optional" />
          </FormField>
          <FormField label="Notes" htmlFor="sg-notes" className="sm:col-span-2">
            <Textarea id="sg-notes" rows={2} defaultValue="Size M. Runs long in the sleeve." />
          </FormField>
        </div>
      </Block>

      <Block title="Item tile">
        <div className="grid grid-cols-2 gap-x-4 gap-y-6 sm:grid-cols-4">
          {SAMPLES.map((s, i) => (
            <ItemTile key={s.name} item={s} selected={i === 1} />
          ))}
        </div>
      </Block>

      <Block title="Surfaces">
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
          <Card className="p-4 shadow-control">
            <p className="font-medium">Control</p>
            <p className="text-caption text-ink-soft">Buttons and fields. 10px corners.</p>
          </Card>
          <Card className="p-4 shadow-card">
            <p className="font-medium">Card</p>
            <p className="text-caption text-ink-soft">Tiles, menus and popovers. 14px corners.</p>
          </Card>
          <Card className="rounded-sheet p-4 shadow-overlay">
            <p className="font-medium">Overlay</p>
            <p className="text-caption text-ink-soft">Dialogs and sheets. 22px corners.</p>
          </Card>
        </div>
        <Skeleton className="mt-6 h-10 w-64" />
      </Block>
    </main>
  );
}

import type { Metadata } from "next";
import { brand } from "@/lib/brand";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/session";
import { loadWardrobe } from "@/lib/wardrobe";
import Studio from "../Studio";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: `Closet · ${brand.name}`,
  robots: { index: false, follow: false },
};

export default async function StudioPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ show?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/");
  const { id } = await params;
  const { show } = await searchParams;

  const payload = await loadWardrobe(user.id, id);
  if (!payload) redirect("/studio");

  if (user.lastWardrobeId !== id) {
    await prisma.user.update({ where: { id: user.id }, data: { lastWardrobeId: id } });
  }

  return (
    <Studio
      key={id}
      initial={payload}
      show={show === "want" ? "want" : undefined}
      user={{ id: user.id, email: user.email, handle: user.handle, displayCurrency: user.displayCurrency }}
    />
  );
}

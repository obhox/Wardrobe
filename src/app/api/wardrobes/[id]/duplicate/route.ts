import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/session";
import { error, json, notFound, unauthorized } from "@/lib/server/http";

export const dynamic = "force-dynamic";

// POST → copy a wardrobe's theme and sections (not its items)
// — a quick way to start a new canvas with the same look.
export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return unauthorized();
  const { id } = await params;

  const src = await prisma.wardrobe.findFirst({
    where: { id, ownerId: user.id },
    include: { sections: true },
  });
  if (!src) return notFound();
  const n = await prisma.wardrobe.count({ where: { ownerId: user.id } });
  if (n >= 20) return error("You can keep up to 20 wardrobes.", 400);

  const copy = await prisma.wardrobe.create({
    data: {
      ownerId: user.id,
      title: `${src.title} (copy)`.slice(0, 60),
      tagline: src.tagline,
      icon: src.icon,
      theme: src.theme,
      layoutMode: src.layoutMode,
      sortKey: src.sortKey,
      order: n,
      sections: {
        create: src.sections.map(({ name, icon, color, order, shared }) => ({ name, icon, color, order, shared })),
      },
    },
  });
  await prisma.user.update({ where: { id: user.id }, data: { lastWardrobeId: copy.id } });
  return json({ id: copy.id });
}

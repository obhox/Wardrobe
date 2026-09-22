import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/session";
import { unauthorized } from "@/lib/server/http";

export const dynamic = "force-dynamic";

// GET → everything we hold about you, as JSON (no secrets or hashes).
export async function GET() {
  const me = await getCurrentUser();
  if (!me) return unauthorized();

  const user = await prisma.user.findUniqueOrThrow({
    where: { id: me.id },
    select: {
      handle: true,
      displayName: true,
      recoveryEmail: true,
      defaultTheme: true,
      displayCurrency: true,
      createdAt: true,
      passkeys: { select: { deviceLabel: true, createdAt: true } },
      wardrobes: {
        orderBy: [{ order: "asc" }, { createdAt: "asc" }],
        include: {
          sections: { orderBy: { order: "asc" } },
          stickers: true,
          items: {
            orderBy: { createdAt: "asc" },
            include: { prices: { orderBy: { checkedAt: "asc" }, select: { price: true, currency: true, checkedAt: true } } },
          },
        },
      },
    },
  });

  const body = JSON.stringify(
    { exportedAt: new Date().toISOString(), format: "wardrobe-export/1", ...user },
    null,
    2
  );
  return new NextResponse(body, {
    headers: {
      "content-type": "application/json; charset=utf-8",
      "content-disposition": `attachment; filename="wardrobe-${me.handle}.json"`,
      "cache-control": "no-store",
    },
  });
}

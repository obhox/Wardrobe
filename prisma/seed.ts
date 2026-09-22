import { PrismaClient } from "@prisma/client";
import argon2 from "argon2";
import crypto from "crypto";

const prisma = new PrismaClient();

// Deterministic demo combination so you can log in after seeding.
// Sign in with handle "moth-7" + this combination.
const DEMO_COMBINATION = "linen · brass · moth · button · 7";
const DEMO_HANDLE = "moth-7";
const LOOKUP_PEPPER = process.env.LOOKUP_PEPPER ?? "wardrobe-dev-pepper";

// must match normalizeCombination() in src/lib/auth/combination.ts
function normalize(input: string) {
  return input.toLowerCase().replace(/[·•,/|.\-_]+/g, " ").replace(/\s+/g, " ").trim();
}

function lookupHash(value: string) {
  return crypto.createHmac("sha256", LOOKUP_PEPPER).update(value).digest("hex");
}

async function main() {
  console.log("seeding wardrobe…");

  await prisma.user.deleteMany({ where: { handle: DEMO_HANDLE } });

  const user = await prisma.user.create({
    data: {
      handle: DEMO_HANDLE,
      displayName: "demo",
      combinationHash: await argon2.hash(normalize(DEMO_COMBINATION), {
        type: argon2.argon2id,
        memoryCost: 19456,
        timeCost: 2,
        parallelism: 1,
      }),
      lookupHash: lookupHash(`${DEMO_HANDLE}:${normalize(DEMO_COMBINATION)}`),
      defaultTheme: "daylight",
      recoveryEmail: "demo@wardrobe.local",
    },
  });

  const wardrobe = await prisma.wardrobe.create({
    data: {
      ownerId: user.id,
      title: "moth's wardrobe",
      tagline: "everything, arranged just so.",
      icon: "✦",
      order: 0,
      ground: "daylight",
      pattern: "none",
      accent: "cobalt",
    },
  });

  const sections = await Promise.all(
    [
      { name: "tops", icon: "✦", color: "cobalt", order: 0 },
      { name: "shoes", icon: "✦", color: "terracotta", order: 1 },
      { name: "bags", icon: "✦", color: "honey", order: 2 },
      { name: "want", icon: "✦", color: "blush", order: 3 },
    ].map((s) =>
      prisma.section.create({ data: { ...s, wardrobeId: wardrobe.id } })
    )
  );

  const [tops, shoes, bags, wantSec] = sections;

  const demoItems: Array<{
    name: string;
    brand: string;
    imageUrl: string;
    sectionId: string;
    status: "owned" | "want";
    price?: number;
    sizeTier: string;
    hue: number;
    posX: number;
    posY: number;
    rotation: number;
    boughtAt?: string;
    targetPrice?: number;
    sourceUrl?: string;
    history?: number[];
  }> = [
    {
      name: "oversized linen shirt",
      brand: "cos",
      imageUrl:
        "https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?w=500&q=80",
      sectionId: tops.id,
      status: "owned",
      price: 89,
      sizeTier: "large",
      hue: 35,
      posX: 0.18,
      posY: 0.22,
      rotation: -8,
      boughtAt: "cos, regent st",
    },
    {
      name: "striped tee",
      brand: "saint james",
      imageUrl:
        "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=500&q=80",
      sectionId: tops.id,
      status: "owned",
      price: 60,
      sizeTier: "medium",
      hue: 210,
      posX: 0.4,
      posY: 0.36,
      rotation: 6,
      boughtAt: "vinted",
    },
    {
      name: "white leather sneakers",
      brand: "common projects",
      imageUrl:
        "https://images.unsplash.com/photo-1549298916-b41d501d3772?w=500&q=80",
      sectionId: shoes.id,
      status: "owned",
      price: 410,
      sizeTier: "large",
      hue: 30,
      posX: 0.62,
      posY: 0.2,
      rotation: 10,
      boughtAt: "ssense",
    },
    {
      name: "brown loafers",
      brand: "g.h. bass",
      imageUrl:
        "https://images.unsplash.com/photo-1614252369475-531eba835eb1?w=500&q=80",
      sectionId: shoes.id,
      status: "owned",
      price: 175,
      sizeTier: "medium",
      hue: 24,
      posX: 0.78,
      posY: 0.42,
      rotation: -5,
      boughtAt: "end.",
    },
    {
      name: "canvas tote",
      brand: "muji",
      imageUrl:
        "https://images.unsplash.com/photo-1544816155-12df9643f363?w=500&q=80",
      sectionId: bags.id,
      status: "owned",
      price: 18,
      sizeTier: "medium",
      hue: 40,
      posX: 0.3,
      posY: 0.62,
      rotation: 4,
      boughtAt: "muji",
    },
    {
      name: "leather crossbody",
      brand: "polène",
      imageUrl:
        "https://images.unsplash.com/photo-1590874103328-eac38a683ce7?w=500&q=80",
      sectionId: bags.id,
      status: "owned",
      price: 350,
      sizeTier: "hero",
      hue: 18,
      posX: 0.52,
      posY: 0.66,
      rotation: -10,
      boughtAt: "polène, paris",
    },
    {
      name: "wool overcoat",
      brand: "uniqlo u",
      imageUrl:
        "https://images.unsplash.com/photo-1539533018447-63fcce2678e3?w=500&q=80",
      sectionId: wantSec.id,
      status: "want",
      targetPrice: 130,
      sizeTier: "hero",
      hue: 0,
      posX: 0.72,
      posY: 0.66,
      rotation: 7,
    },
    {
      name: "silver hoops",
      brand: "mejuri",
      imageUrl:
        "https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?w=500&q=80",
      sectionId: wantSec.id,
      status: "want",
      price: 92,
      targetPrice: 75,
      sourceUrl: "https://example.com/products/gold-hoops",
      history: [110, 104, 104, 98, 92],
      sizeTier: "small",
      hue: 0,
      posX: 0.12,
      posY: 0.5,
      rotation: -3,
    },
  ];

  const day = 24 * 60 * 60 * 1000;
  for (const it of demoItems) {
    await prisma.item.create({
      data: {
        wardrobeId: wardrobe.id,
        sectionId: it.sectionId,
        imageUrl: it.imageUrl,
        sourceUrl: it.sourceUrl,
        currency: "USD",
        lowestPrice: it.history ? Math.min(...it.history) : it.price,
        ...(it.history
          ? {
              prices: {
                create: it.history.map((price, i) => ({
                  price,
                  currency: "USD",
                  checkedAt: new Date(Date.now() - (it.history!.length - i) * 3 * day),
                })),
              },
            }
          : {}),
        name: it.name,
        brand: it.brand,
        price: it.price,
        status: it.status,
        boughtAt: it.boughtAt,
        targetPrice: it.targetPrice,
        posX: it.posX,
        posY: it.posY,
        rotation: it.rotation,
        sizeTier: it.sizeTier,
        hue: it.hue,
        sourceType: "scraped",
      },
    });
  }

  // a second wardrobe, to show the switcher
  const wishlist = await prisma.wardrobe.create({
    data: {
      ownerId: user.id,
      title: "wishlist",
      tagline: "things i'm keeping an eye on.",
      icon: "♡",
      order: 1,
      ground: "bubblegum",
      pattern: "polka",
      accent: "blush",
      layoutMode: "gallery",
      sections: { create: [{ name: "soon", color: "blush", icon: "✦", order: 0 }] },
    },
  });
  await prisma.user.update({ where: { id: user.id }, data: { lastWardrobeId: wardrobe.id } });
  void wishlist;

  console.log(`✦ seeded user "${DEMO_HANDLE}"`);
  console.log(`  combination: ${DEMO_COMBINATION}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

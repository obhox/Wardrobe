import { Heart, Shirt, UserRound, type LucideIcon } from "lucide-react";

// The app's main destinations: a bar along the bottom on phones, a rail down
// the side on wider screens. New screens are added here.

export interface Tab {
  id: "closet" | "wishlist" | "you";
  label: string;
  href: string;
  Icon: LucideIcon;
}

export const TABS: Tab[] = [
  { id: "closet", label: "Closet", href: "/studio", Icon: Shirt },
  // for now the wishlist is the open wardrobe filtered to what you want
  { id: "wishlist", label: "Wishlist", href: "/studio?show=want", Icon: Heart },
  { id: "you", label: "You", href: "/you", Icon: UserRound },
];

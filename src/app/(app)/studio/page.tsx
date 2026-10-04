import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { resolveWardrobeId } from "@/lib/wardrobe";

export const dynamic = "force-dynamic";

// /studio → the wardrobe you last opened (?show=want opens its wishlist view)
export default async function StudioIndex({ searchParams }: { searchParams: Promise<{ show?: string }> }) {
  const user = await getCurrentUser();
  if (!user) redirect("/");
  const id = await resolveWardrobeId(user.id, null, user.lastWardrobeId);
  if (!id) redirect("/");
  const { show } = await searchParams;
  redirect(`/studio/${id}${show === "want" ? "?show=want" : ""}`);
}

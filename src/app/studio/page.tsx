import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { resolveWardrobeId } from "@/lib/wardrobe";

export const dynamic = "force-dynamic";

// /studio → the wardrobe you last opened
export default async function StudioIndex() {
  const user = await getCurrentUser();
  if (!user) redirect("/");
  const id = await resolveWardrobeId(user.id, null, user.lastWardrobeId);
  if (!id) redirect("/");
  redirect(`/studio/${id}`);
}

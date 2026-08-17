import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { loadWardrobe } from "@/lib/wardrobe";
import Studio from "./Studio";

export const dynamic = "force-dynamic";

export default async function StudioPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/");

  const payload = await loadWardrobe(user.id);
  if (!payload) redirect("/");

  return (
    <Studio
      initial={payload}
      user={{ id: user.id, email: user.email }}
    />
  );
}

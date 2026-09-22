import { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { loadWardrobe, resolveWardrobeId } from "@/lib/wardrobe";
import { json, notFound, unauthorized } from "@/lib/server/http";

export const dynamic = "force-dynamic";

// Legacy single-wardrobe endpoint (older extension builds read sections from
// here). New clients use /api/wardrobes/[id].
export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return unauthorized();
  const id = await resolveWardrobeId(user.id, req.nextUrl.searchParams.get("w"), user.lastWardrobeId);
  const payload = id ? await loadWardrobe(user.id, id) : null;
  return payload ? json(payload) : notFound();
}

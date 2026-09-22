import "server-only";
import { NextRequest } from "next/server";
import { getCurrentUser, type SessionUser } from "@/lib/auth/session";
import { resolveWardrobeId } from "@/lib/wardrobe";

// Which wardrobe a collection request targets: `?w=` (GET) or `wardrobeId`
// in the body (writes). Falls back to the user's last-opened wardrobe so
// older clients (and the extension) keep working.
export async function wardrobeScope(
  req: NextRequest,
  body?: unknown
): Promise<{ user: SessionUser; wardrobeId: string } | { user: SessionUser | null; wardrobeId: null }> {
  const user = await getCurrentUser();
  if (!user) return { user: null, wardrobeId: null };
  const fromBody =
    body && typeof body === "object" && "wardrobeId" in body
      ? String((body as { wardrobeId: unknown }).wardrobeId ?? "")
      : "";
  const requested = fromBody || req.nextUrl.searchParams.get("w") || null;
  const wardrobeId = await resolveWardrobeId(user.id, requested, user.lastWardrobeId);
  return wardrobeId ? { user, wardrobeId } : { user, wardrobeId: null };
}

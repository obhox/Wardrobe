import { NextRequest } from "next/server";
import { z } from "zod";
import { cookies } from "next/headers";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/session";
import { deletePrefix, userPrefix } from "@/lib/server/storage";
import { error, json, readJson, unauthorized } from "@/lib/server/http";

export const dynamic = "force-dynamic";

// DELETE { confirm: "<handle>" } → permanently delete the account, every
// wardrobe, and every stored photo.
const schema = z.object({ confirm: z.string() });

export async function DELETE(req: NextRequest) {
  const me = await getCurrentUser();
  if (!me) return unauthorized();
  const parsed = schema.safeParse(await readJson(req));
  if (!parsed.success || parsed.data.confirm.trim().toLowerCase() !== me.handle) {
    return error("type your handle to confirm", 400);
  }

  await deletePrefix(userPrefix(me.id)).catch((e) =>
    console.error("[account:delete] storage cleanup failed", e)
  );
  await prisma.user.delete({ where: { id: me.id } }); // cascades everything else
  (await cookies()).delete("wardrobe_session");
  return json({ ok: true });
}

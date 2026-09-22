import "server-only";
import { cookies, headers } from "next/headers";
import { prisma } from "@/lib/db";
import { randomToken, sha256 } from "./crypto";

const COOKIE = "wardrobe_session";
const MAX_AGE = 60 * 60 * 24 * 30; // 30 days
const TOUCH_EVERY_MS = 60 * 60 * 1000; // refresh lastSeenAt at most hourly

// The cookie holds a random token; the database only ever stores its sha256,
// so a leaked table (or backup) can't be replayed as live sessions.

export async function createSession(userId: string): Promise<void> {
  const token = randomToken();
  const expiresAt = new Date(Date.now() + MAX_AGE * 1000);
  const ua = (await headers()).get("user-agent")?.slice(0, 200) ?? null;
  await prisma.session.create({
    data: { userId, token: sha256(token), expiresAt, userAgent: ua },
  });

  const jar = await cookies();
  jar.set(COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE,
  });
}

export async function destroySession(): Promise<void> {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (token) {
    await prisma.session.deleteMany({ where: { token: sha256(token) } });
    jar.delete(COOKIE);
  }
}

export interface SessionUser {
  id: string;
  handle: string;
  displayName: string | null;
  defaultTheme: string;
  email: string | null;
  hasCombination: boolean;
  displayCurrency: string;
  lastWardrobeId: string | null;
  sessionId: string;
}

export async function getCurrentUser(): Promise<SessionUser | null> {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (!token) return null;

  const session = await prisma.session.findUnique({
    where: { token: sha256(token) },
    include: { user: true },
  });
  if (!session) return null;
  if (session.expiresAt < new Date()) {
    await prisma.session.deleteMany({ where: { id: session.id } });
    return null;
  }
  if (Date.now() - session.lastSeenAt.getTime() > TOUCH_EVERY_MS) {
    prisma.session
      .update({ where: { id: session.id }, data: { lastSeenAt: new Date() } })
      .catch(() => {});
  }
  const { user } = session;
  return {
    id: user.id,
    handle: user.handle,
    displayName: user.displayName,
    defaultTheme: user.defaultTheme,
    email: user.recoveryEmail,
    hasCombination: Boolean(user.combinationHash),
    displayCurrency: user.displayCurrency,
    lastWardrobeId: user.lastWardrobeId,
    sessionId: session.id,
  };
}

export async function requireUser(): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) throw new Error("UNAUTHORIZED");
  return user;
}

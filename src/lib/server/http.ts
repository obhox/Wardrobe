import "server-only";
import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";

// Small shared helpers for route handlers.

export function json(data: unknown, status = 200, headers?: HeadersInit) {
  return NextResponse.json(data, { status, headers });
}

export function error(message: string, status: number, extra?: Record<string, unknown>) {
  return NextResponse.json({ error: message, ...extra }, { status });
}

export const unauthorized = () => error("not signed in", 401);
export const notFound = () => error("not found", 404);
export const invalid = () => error("invalid input", 400);

export function tooMany(retryAfterMs: number) {
  return NextResponse.json(
    { error: "too many tries — wait a moment", retryAfterMs },
    { status: 429, headers: { "retry-after": String(Math.ceil(retryAfterMs / 1000)) } }
  );
}

export async function readJson(req: NextRequest): Promise<unknown> {
  try {
    return await req.json();
  } catch {
    return null;
  }
}

// Best-effort client address. Behind Railway/Coolify the proxy sets
// x-forwarded-for; the left-most entry is the original client.
export function clientIp(req: NextRequest): string {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return req.headers.get("x-real-ip") ?? "unknown";
}

export function isUniqueViolation(e: unknown): boolean {
  return e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002";
}

export function isNotFound(e: unknown): boolean {
  return e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2025";
}

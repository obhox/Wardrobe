import { NextResponse } from "next/server";
import { brand } from "@/lib/brand";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({ ok: true, service: brand.slug });
}

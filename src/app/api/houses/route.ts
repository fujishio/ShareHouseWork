import { NextResponse } from "next/server";
import { createHouse, listHouses } from "@/server/house-store";
import type { HouseCreateResponse, HouseListResponse } from "@/types";

export const runtime = "nodejs";

export async function GET() {
  const houses = await listHouses();
  return NextResponse.json({ data: houses }) as NextResponse<HouseListResponse>;
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (typeof body !== "object" || body === null) {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const raw = body as Record<string, unknown>;
  const name = typeof raw.name === "string" ? raw.name.trim() : "";
  const description = typeof raw.description === "string" ? raw.description.trim() : "";
  const ownerUid = typeof raw.ownerUid === "string" ? raw.ownerUid.trim() : "";

  if (!name) {
    return NextResponse.json({ error: "name is required" }, { status: 400 });
  }

  const created = await createHouse({
    name,
    description: description || undefined,
    ownerUid: ownerUid || undefined,
  });
  return NextResponse.json({ data: created }, { status: 201 }) as NextResponse<HouseCreateResponse>;
}

import { NextResponse } from "next/server";
import { addHouseMember } from "@/server/house-store";
import { getUser } from "@/server/user-store";
import type { HouseMemberAddResponse } from "@/types";

type Params = {
  params: Promise<{ id: string }>;
};

export const runtime = "nodejs";

export async function POST(request: Request, { params }: Params) {
  const { id } = await params;

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
  const userUid = typeof raw.userUid === "string" ? raw.userUid.trim() : "";
  if (!userUid) {
    return NextResponse.json({ error: "userUid is required" }, { status: 400 });
  }

  const user = await getUser(userUid);
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const updated = await addHouseMember(id, userUid);
  if (!updated) {
    return NextResponse.json({ error: "House not found" }, { status: 404 });
  }

  return NextResponse.json({ data: updated }) as NextResponse<HouseMemberAddResponse>;
}

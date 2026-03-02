import { NextResponse } from "next/server";
import { listUsers, upsertUser } from "@/server/user-store";
import type { UserListResponse } from "@/types";

export const runtime = "nodejs";

export async function GET() {
  const users = await listUsers();
  return NextResponse.json({ data: users }) as NextResponse<UserListResponse>;
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
  const uid = typeof raw.uid === "string" ? raw.uid.trim() : "";
  const name = typeof raw.name === "string" ? raw.name.trim() : "";
  const color = typeof raw.color === "string" ? raw.color.trim() : "";
  const email = typeof raw.email === "string" ? raw.email.trim() : "";

  if (!uid || !name || !color || !email) {
    return NextResponse.json({ error: "uid, name, color, email are required" }, { status: 400 });
  }

  const created = await upsertUser(uid, { name, color, email });
  return NextResponse.json({ data: created }, { status: 201 });
}

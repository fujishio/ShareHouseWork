import { NextResponse } from "next/server";
import { listUsers, upsertUser } from "@/server/user-store";
import { verifyRequest, unauthorizedResponse } from "@/server/auth";
import type { ApiErrorResponse, UserListResponse } from "@/types";
import { z } from "zod";
import { zNonEmptyTrimmedString } from "@/shared/lib/api-validation";

export const runtime = "nodejs";

const upsertUserSchema = z.object({
  uid: zNonEmptyTrimmedString,
  name: zNonEmptyTrimmedString,
  color: zNonEmptyTrimmedString,
  email: zNonEmptyTrimmedString,
});

export async function GET(request: Request) {
  const actor = await verifyRequest(request).catch(() => null);
  if (!actor) return unauthorizedResponse();

  const users = await listUsers();
  return NextResponse.json({ data: users }) as NextResponse<UserListResponse>;
}

export async function POST(request: Request) {
  // Registration flow can call this before session token is available.
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON", code: "INVALID_JSON", details: "Request body must be valid JSON." },
      { status: 400 }
    ) as NextResponse<ApiErrorResponse>;
  }

  const parsed = upsertUserSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "uid, name, color, email are required",
        code: "VALIDATION_ERROR",
        details: parsed.error.issues,
      },
      { status: 400 }
    ) as NextResponse<ApiErrorResponse>;
  }

  const created = await upsertUser(parsed.data.uid, {
    name: parsed.data.name,
    color: parsed.data.color,
    email: parsed.data.email,
  });
  return NextResponse.json({ data: created }, { status: 201 });
}

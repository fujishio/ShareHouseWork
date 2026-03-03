import { NextResponse } from "next/server";
import { verifyRequest, unauthorizedResponse } from "@/server/auth";
import { getUser, upsertUser } from "@/server/user-store";
import type { ApiErrorResponse } from "@/types";
import { z } from "zod";
import { PRESET_COLORS } from "@/shared/constants/house";

export const runtime = "nodejs";

const patchProfileSchema = z.object({
  color: z.string().refine(
    (c) => (PRESET_COLORS as readonly string[]).includes(c),
    { message: "Invalid color: must be one of the preset colors" }
  ),
});

export async function PATCH(request: Request) {
  let actor;
  try {
    actor = await verifyRequest(request);
  } catch {
    return unauthorizedResponse();
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON", code: "INVALID_JSON" },
      { status: 400 }
    ) as NextResponse<ApiErrorResponse>;
  }

  const parsed = patchProfileSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid color", code: "VALIDATION_ERROR", details: parsed.error.issues },
      { status: 400 }
    ) as NextResponse<ApiErrorResponse>;
  }

  const existing = await getUser(actor.uid);
  if (!existing) {
    return NextResponse.json(
      { error: "User not found", code: "NOT_FOUND" },
      { status: 404 }
    ) as NextResponse<ApiErrorResponse>;
  }

  const updated = await upsertUser(actor.uid, {
    name: existing.name,
    color: parsed.data.color,
    email: existing.email ?? "",
  });

  return NextResponse.json({ data: updated });
}

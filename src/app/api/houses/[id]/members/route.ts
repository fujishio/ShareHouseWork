import { NextResponse } from "next/server";
import { addHouseMember } from "@/server/house-store";
import { getUser } from "@/server/user-store";
import type { ApiErrorResponse, HouseMemberAddResponse } from "@/types";
import { z } from "zod";
import { zNonEmptyTrimmedString } from "@/shared/lib/api-validation";

type Params = {
  params: Promise<{ id: string }>;
};

export const runtime = "nodejs";

const addHouseMemberSchema = z.object({
  userUid: zNonEmptyTrimmedString,
});

export async function POST(request: Request, { params }: Params) {
  const { id } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON", code: "INVALID_JSON" },
      { status: 400 }
    ) as NextResponse<ApiErrorResponse>;
  }

  const parsed = addHouseMemberSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "userUid is required", code: "VALIDATION_ERROR", details: parsed.error.issues },
      { status: 400 }
    ) as NextResponse<ApiErrorResponse>;
  }
  const { userUid } = parsed.data;

  const user = await getUser(userUid);
  if (!user) {
    return NextResponse.json(
      { error: "User not found", code: "USER_NOT_FOUND" },
      { status: 404 }
    ) as NextResponse<ApiErrorResponse>;
  }

  const updated = await addHouseMember(id, userUid);
  if (!updated) {
    return NextResponse.json(
      { error: "House not found", code: "HOUSE_NOT_FOUND" },
      { status: 404 }
    ) as NextResponse<ApiErrorResponse>;
  }

  return NextResponse.json({ data: updated }) as NextResponse<HouseMemberAddResponse>;
}

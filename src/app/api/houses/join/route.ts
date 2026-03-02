import { NextResponse } from "next/server";
import { findHouseByNameAndJoinPassword, addHouseMember } from "@/server/house-store";
import { getUser } from "@/server/user-store";
import type { ApiErrorResponse, HouseMemberAddResponse } from "@/types";
import { z } from "zod";
import { zNonEmptyTrimmedString } from "@/shared/lib/api-validation";

export const runtime = "nodejs";

const joinHouseSchema = z.object({
  houseName: zNonEmptyTrimmedString,
  joinPassword: zNonEmptyTrimmedString,
  userUid: zNonEmptyTrimmedString,
});

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON", code: "INVALID_JSON" },
      { status: 400 }
    ) as NextResponse<ApiErrorResponse>;
  }

  const parsed = joinHouseSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid body", code: "VALIDATION_ERROR", details: parsed.error.issues },
      { status: 400 }
    ) as NextResponse<ApiErrorResponse>;
  }

  const { houseName, joinPassword, userUid } = parsed.data;

  const user = await getUser(userUid);
  if (!user) {
    return NextResponse.json(
      { error: "ユーザーが見つかりません", code: "USER_NOT_FOUND" },
      { status: 404 }
    ) as NextResponse<ApiErrorResponse>;
  }

  const house = await findHouseByNameAndJoinPassword(houseName, joinPassword);
  if (!house) {
    return NextResponse.json(
      { error: "ハウスが見つかりません。ハウス名か合言葉をご確認ください", code: "HOUSE_NOT_FOUND" },
      { status: 404 }
    ) as NextResponse<ApiErrorResponse>;
  }

  const updated = await addHouseMember(house.id, userUid);
  if (!updated) {
    return NextResponse.json(
      { error: "メンバー追加に失敗しました", code: "MEMBER_ADD_FAILED" },
      { status: 500 }
    ) as NextResponse<ApiErrorResponse>;
  }

  return NextResponse.json({ data: updated }, { status: 200 }) as NextResponse<HouseMemberAddResponse>;
}

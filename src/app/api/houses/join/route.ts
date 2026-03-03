import { findHouseByNameAndJoinPassword, addHouseMember } from "@/server/house-store";
import { getUser } from "@/server/user-store";
import { z } from "zod";
import { zNonEmptyTrimmedString } from "@/shared/lib/api-validation";
import { errorJson, successJson } from "@/shared/lib/api-response";

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
    return errorJson(
      "Invalid JSON",
      "INVALID_JSON",
      400,
      "Request body must be valid JSON."
    );
  }

  const parsed = joinHouseSchema.safeParse(body);
  if (!parsed.success) {
    return errorJson("Invalid body", "VALIDATION_ERROR", 400, parsed.error.issues);
  }

  const { houseName, joinPassword, userUid } = parsed.data;

  const user = await getUser(userUid);
  if (!user) {
    return errorJson("ユーザーが見つかりません", "USER_NOT_FOUND", 404, { userUid });
  }

  const house = await findHouseByNameAndJoinPassword(houseName, joinPassword);
  if (!house) {
    return errorJson(
      "ハウスが見つかりません。ハウス名か合言葉をご確認ください",
      "HOUSE_NOT_FOUND",
      404,
      { houseName }
    );
  }

  const updated = await addHouseMember(house.id, userUid);
  if (!updated) {
    return errorJson("メンバー追加に失敗しました", "MEMBER_ADD_FAILED", 500, {
      houseId: house.id,
      userUid,
    });
  }

  return successJson(updated, { status: 200 });
}

import { findHouseByNameAndJoinPassword, addHouseMember } from "@/server/house-store";
import { syncContributionMemberCountForCurrentMonth } from "@/server/contribution-settings-store";
import { getUser } from "@/server/user-store";
import { verifyRequest, unauthorizedResponse } from "@/server/auth";
import { z } from "zod";
import { zNonEmptyTrimmedString } from "@/shared/lib/api-validation";
import { errorJson, successJson } from "@/shared/lib/api-response";

export const runtime = "nodejs";

const joinHouseSchema = z.object({
  houseName: zNonEmptyTrimmedString,
  joinPassword: zNonEmptyTrimmedString,
});

export async function POST(request: Request) {
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

  const { houseName, joinPassword } = parsed.data;
  const userUid = actor.uid;

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
  await syncContributionMemberCountForCurrentMonth(updated.id, updated.memberUids.length);

  return successJson(updated, { status: 200 });
}

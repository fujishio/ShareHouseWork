import { getHouse, grantHostRole, revokeHostRole } from "@/server/house-store";
import { verifyRequest, unauthorizedResponse } from "@/server/auth";
import { z } from "zod";
import { zNonEmptyTrimmedString } from "@/shared/lib/api-validation";
import { errorJson, successJson } from "@/shared/lib/api-response";

export const runtime = "nodejs";

type Params = {
  params: Promise<{ id: string }>;
};

const rolesSchema = z.object({
  userUid: zNonEmptyTrimmedString,
  action: z.enum(["grant", "revoke"]),
});

export async function POST(request: Request, { params }: Params) {
  let actor;
  try {
    actor = await verifyRequest(request);
  } catch {
    return unauthorizedResponse();
  }

  const { id } = await params;

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

  const parsed = rolesSchema.safeParse(body);
  if (!parsed.success) {
    return errorJson("Invalid body", "VALIDATION_ERROR", 400, parsed.error.issues);
  }

  const { userUid, action } = parsed.data;

  const house = await getHouse(id);
  if (!house) {
    return errorJson("ハウスが見つかりません", "HOUSE_NOT_FOUND", 404, { houseId: id });
  }

  if (!house.hostUids.includes(actor.uid)) {
    return unauthorizedResponse("ホスト権限が必要です");
  }

  if (action === "grant") {
    const updated = await grantHostRole(id, userUid);
    if (!updated) {
      return errorJson("権限付与に失敗しました", "GRANT_FAILED", 500, { houseId: id, userUid });
    }
    return successJson(updated);
  } else {
    const updated = await revokeHostRole(id, userUid);
    if (!updated) {
      return errorJson("最後のホストは削除できません", "LAST_HOST", 400, { houseId: id, userUid });
    }
    return successJson(updated);
  }
}

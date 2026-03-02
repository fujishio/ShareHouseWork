import { NextResponse } from "next/server";
import { getHouse, grantHostRole, revokeHostRole } from "@/server/house-store";
import { verifyRequest, unauthorizedResponse } from "@/server/auth";
import type { ApiErrorResponse, HouseCreateResponse } from "@/types";
import { z } from "zod";
import { zNonEmptyTrimmedString } from "@/shared/lib/api-validation";

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
    return NextResponse.json(
      { error: "Invalid JSON", code: "INVALID_JSON" },
      { status: 400 }
    ) as NextResponse<ApiErrorResponse>;
  }

  const parsed = rolesSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid body", code: "VALIDATION_ERROR", details: parsed.error.issues },
      { status: 400 }
    ) as NextResponse<ApiErrorResponse>;
  }

  const { userUid, action } = parsed.data;

  const house = await getHouse(id);
  if (!house) {
    return NextResponse.json(
      { error: "ハウスが見つかりません", code: "HOUSE_NOT_FOUND" },
      { status: 404 }
    ) as NextResponse<ApiErrorResponse>;
  }

  if (!house.hostUids.includes(actor.uid)) {
    return unauthorizedResponse("ホスト権限が必要です");
  }

  if (action === "grant") {
    const updated = await grantHostRole(id, userUid);
    if (!updated) {
      return NextResponse.json(
        { error: "権限付与に失敗しました", code: "GRANT_FAILED" },
        { status: 500 }
      ) as NextResponse<ApiErrorResponse>;
    }
    return NextResponse.json({ data: updated }) as NextResponse<HouseCreateResponse>;
  } else {
    const updated = await revokeHostRole(id, userUid);
    if (!updated) {
      return NextResponse.json(
        { error: "最後のホストは削除できません", code: "LAST_HOST" },
        { status: 400 }
      ) as NextResponse<ApiErrorResponse>;
    }
    return NextResponse.json({ data: updated }) as NextResponse<HouseCreateResponse>;
  }
}

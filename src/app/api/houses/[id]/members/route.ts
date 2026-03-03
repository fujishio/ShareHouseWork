import { addHouseMember } from "@/server/house-store";
import { getUser } from "@/server/user-store";
import { z } from "zod";
import { zNonEmptyTrimmedString } from "@/shared/lib/api-validation";
import { errorJson, successJson } from "@/shared/lib/api-response";

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
    return errorJson(
      "Invalid JSON",
      "INVALID_JSON",
      400,
      "Request body must be valid JSON."
    );
  }

  const parsed = addHouseMemberSchema.safeParse(body);
  if (!parsed.success) {
    return errorJson("userUid is required", "VALIDATION_ERROR", 400, parsed.error.issues);
  }
  const { userUid } = parsed.data;

  const user = await getUser(userUid);
  if (!user) {
    return errorJson("User not found", "USER_NOT_FOUND", 404, { userUid });
  }

  const updated = await addHouseMember(id, userUid);
  if (!updated) {
    return errorJson("House not found", "HOUSE_NOT_FOUND", 404, { houseId: id });
  }

  return successJson(updated);
}

import { verifyRequest, unauthorizedResponse } from "@/server/auth";
import { getUser, upsertUser } from "@/server/user-store";
import { z } from "zod";
import { isPresetColor } from "@/shared/constants/house";
import { errorJson, successJson } from "@/shared/lib/api-response";
import { deleteAccountAndAnonymize } from "@/server/account-deletion-service";

export const runtime = "nodejs";

const patchProfileSchema = z.object({
  color: z.string().refine(
    (c) => isPresetColor(c),
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
    return errorJson(
      "Invalid JSON",
      "INVALID_JSON",
      400,
      "Request body must be valid JSON."
    );
  }

  const parsed = patchProfileSchema.safeParse(body);
  if (!parsed.success) {
    return errorJson("Invalid color", "VALIDATION_ERROR", 400, parsed.error.issues);
  }

  const existing = await getUser(actor.uid);
  if (!existing) {
    return errorJson("User not found", "NOT_FOUND", 404, { uid: actor.uid });
  }

  const updated = await upsertUser(actor.uid, {
    name: existing.name,
    color: parsed.data.color,
    email: existing.email ?? "",
  });

  return successJson(updated);
}

export async function DELETE(request: Request) {
  let actor;
  try {
    actor = await verifyRequest(request);
  } catch {
    return unauthorizedResponse();
  }

  const existing = await getUser(actor.uid);
  const displayName = existing?.name ?? actor.name;

  try {
    const result = await deleteAccountAndAnonymize({
      uid: actor.uid,
      displayName,
    });
    return successJson(result);
  } catch (_error) {
    return errorJson(
      "退会処理に失敗しました",
      "ACCOUNT_DELETE_FAILED",
      500,
      { uid: actor.uid }
    );
  }
}

import { listUsers, upsertUser } from "@/server/user-store";
import { verifyRequest, unauthorizedResponse, resolveActorHouseId } from "@/server/auth";
import { getHouse } from "@/server/house-store";
import { z } from "zod";
import { zNonEmptyTrimmedString } from "@/shared/lib/api-validation";
import { errorJson, successJson } from "@/shared/lib/api-response";

export const runtime = "nodejs";

const upsertUserSchema = z.object({
  name: zNonEmptyTrimmedString,
  color: zNonEmptyTrimmedString,
  email: zNonEmptyTrimmedString,
});

export async function GET(request: Request) {
  const actor = await verifyRequest(request).catch(() => null);
  if (!actor) return unauthorizedResponse();

  const houseId = await resolveActorHouseId(actor.uid);
  if (!houseId) return errorJson("No house found for user", "NO_HOUSE", 403);
  const memberUids = (await getHouse(houseId))?.memberUids ?? [];

  const users = await listUsers(memberUids);
  // Strip email from each user before returning (TASK-P8)
  const publicUsers = users.map(({ id, name, color }) => ({ id, name, color }));
  return successJson(publicUsers);
}

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

  const parsed = upsertUserSchema.safeParse(body);
  if (!parsed.success) {
    return errorJson(
      "name, color, email are required",
      "VALIDATION_ERROR",
      400,
      parsed.error.issues
    );
  }

  const created = await upsertUser(actor.uid, {
    name: parsed.data.name,
    color: parsed.data.color,
    email: parsed.data.email,
  });
  return successJson(created, { status: 201 });
}

import { createHouse, listHouses } from "@/server/house-store";
import { verifyRequest, unauthorizedResponse } from "@/server/auth";
import { z } from "zod";
import {
  zNonEmptyTrimmedString,
  zTrimmedString,
} from "@/shared/lib/api-validation";
import { errorJson, successJson } from "@/shared/lib/api-response";

export const runtime = "nodejs";

const createHouseSchema = z.object({
  name: zNonEmptyTrimmedString,
  description: zTrimmedString.optional(),
  ownerUid: zTrimmedString.optional(),
  joinPassword: zTrimmedString.optional(),
});

export async function GET(request: Request) {
  const actor = await verifyRequest(request).catch(() => null);
  if (!actor) return unauthorizedResponse();

  const houses = await listHouses();
  return successJson(houses);
}

export async function POST(request: Request) {
  // Registration flow can call this before session token is available.
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

  const parsed = createHouseSchema.safeParse(body);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    if (issue?.path[0] === "name") {
      return errorJson("name is required", "VALIDATION_ERROR", 400, parsed.error.issues);
    }
    return errorJson("Invalid body", "VALIDATION_ERROR", 400, parsed.error.issues);
  }

  const created = await createHouse({
    name: parsed.data.name,
    description: parsed.data.description || undefined,
    ownerUid: parsed.data.ownerUid || undefined,
    joinPassword: parsed.data.joinPassword || undefined,
  });
  return successJson(created, { status: 201 });
}

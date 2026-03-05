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
  name: zNonEmptyTrimmedString.pipe(z.string().max(100)),
  description: zTrimmedString.pipe(z.string().max(500)).optional(),
  joinPassword: zTrimmedString
    .pipe(z.string().max(128).refine((value) => value.length === 0 || value.length >= 8))
    .optional(),
});

export async function GET(request: Request) {
  const actor = await verifyRequest(request).catch(() => null);
  if (!actor) return unauthorizedResponse();

  const houses = await listHouses(actor.uid);
  return successJson(houses);
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
    ownerUid: actor.uid,
    joinPassword: parsed.data.joinPassword || undefined,
  });
  return successJson(created, { status: 201 });
}

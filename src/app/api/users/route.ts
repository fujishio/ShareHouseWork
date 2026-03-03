import { listUsers, upsertUser } from "@/server/user-store";
import { verifyRequest, unauthorizedResponse } from "@/server/auth";
import { z } from "zod";
import { zNonEmptyTrimmedString } from "@/shared/lib/api-validation";
import { errorJson, successJson } from "@/shared/lib/api-response";

export const runtime = "nodejs";

const upsertUserSchema = z.object({
  uid: zNonEmptyTrimmedString,
  name: zNonEmptyTrimmedString,
  color: zNonEmptyTrimmedString,
  email: zNonEmptyTrimmedString,
});

export async function GET(request: Request) {
  const actor = await verifyRequest(request).catch(() => null);
  if (!actor) return unauthorizedResponse();

  const users = await listUsers();
  return successJson(users);
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

  const parsed = upsertUserSchema.safeParse(body);
  if (!parsed.success) {
    return errorJson(
      "uid, name, color, email are required",
      "VALIDATION_ERROR",
      400,
      parsed.error.issues
    );
  }

  const created = await upsertUser(parsed.data.uid, {
    name: parsed.data.name,
    color: parsed.data.color,
    email: parsed.data.email,
  });
  return successJson(created, { status: 201 });
}

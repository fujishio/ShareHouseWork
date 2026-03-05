import { z } from "zod";
import { isPresetColor } from "../../shared/constants/house.ts";
import type { Member, PatchProfileRequest } from "../../types/index.ts";
import {
  errorResponse,
  readJsonBody,
  resolveAuthenticatedActor,
  validationError,
  type AuthenticatedUser,
} from "./route-handler-utils.ts";

const patchProfileSchema = z.object({
  color: z.string().max(32).refine((c) => isPresetColor(c), {
    message: "Invalid color: must be one of the preset colors",
  }),
});

export type PatchProfileDeps = {
  getUser: (uid: string) => Promise<Member | null>;
  upsertUser: (
    uid: string,
    data: { name: string; color: string; email: string }
  ) => Promise<Member>;
  verifyRequest: (request: Request) => Promise<AuthenticatedUser>;
  unauthorizedResponse: (message?: string) => Response;
};

export type DeleteProfileDeps = {
  getUser: (uid: string) => Promise<Member | null>;
  deleteAccountAndAnonymize: (input: {
    uid: string;
    displayName: string;
  }) => Promise<unknown>;
  verifyRequest: (request: Request) => Promise<AuthenticatedUser>;
  unauthorizedResponse: (message?: string) => Response;
};

export async function handlePatchProfile(request: Request, deps: PatchProfileDeps) {
  const actor = await resolveAuthenticatedActor(request, deps);
  if (actor instanceof Response) return actor;

  const parsedBody = await readJsonBody(request);
  if (!parsedBody.ok) return parsedBody.response;

  const parsed = patchProfileSchema.safeParse(parsedBody.body);
  if (!parsed.success) {
    return validationError("Invalid color", parsed.error.issues);
  }

  const existing = await deps.getUser(actor.uid);
  if (!existing) {
    return errorResponse("User not found", 404, "NOT_FOUND", { uid: actor.uid });
  }

  const requestBody: PatchProfileRequest = parsed.data;
  const updated = await deps.upsertUser(actor.uid, {
    name: existing.name,
    color: requestBody.color,
    email: existing.email ?? "",
  });

  return Response.json({ data: updated });
}

export async function handleDeleteProfile(request: Request, deps: DeleteProfileDeps) {
  const actor = await resolveAuthenticatedActor(request, deps);
  if (actor instanceof Response) return actor;

  const existing = await deps.getUser(actor.uid);
  const displayName = existing?.name ?? actor.name;

  try {
    const result = await deps.deleteAccountAndAnonymize({
      uid: actor.uid,
      displayName,
    });
    return Response.json({ data: result });
  } catch {
    return errorResponse("退会処理に失敗しました", 500, "ACCOUNT_DELETE_FAILED", {
      uid: actor.uid,
    });
  }
}

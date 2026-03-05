import type { ApiErrorResponse } from "../../types/index.ts";

export type AuthenticatedUser = {
  uid: string;
  name: string;
  email: string;
};

export type HouseScopedDeps = {
  resolveActorHouseId: (uid: string) => Promise<string | null>;
  verifyRequest: (request: Request) => Promise<AuthenticatedUser>;
  unauthorizedResponse: (message?: string) => Response;
};

export type AuthDeps = Pick<
  HouseScopedDeps,
  "verifyRequest" | "unauthorizedResponse"
>;

export type HouseScopedContext = {
  actor: AuthenticatedUser;
  houseId: string;
};

export function errorResponse(
  error: string,
  status: number,
  code: string,
  details?: unknown
) {
  return Response.json({ error, code, details } satisfies ApiErrorResponse, {
    status,
  });
}

export function validationError(error: string, details?: unknown) {
  return errorResponse(error, 400, "VALIDATION_ERROR", details);
}

export async function resolveAuthenticatedActor(
  request: Request,
  deps: AuthDeps
): Promise<AuthenticatedUser | Response> {
  const actor = await deps.verifyRequest(request).catch(() => null);
  if (!actor) return deps.unauthorizedResponse();
  return actor;
}

export async function resolveHouseScopedContext(
  request: Request,
  deps: HouseScopedDeps
): Promise<HouseScopedContext | Response> {
  const actor = await deps.verifyRequest(request).catch(() => null);
  if (!actor) return deps.unauthorizedResponse();

  const houseId = await deps.resolveActorHouseId(actor.uid);
  if (!houseId) return errorResponse("No house found for user", 403, "NO_HOUSE");

  return { actor, houseId };
}

export async function readJsonBody(
  request: Request
): Promise<{ ok: true; body: unknown } | { ok: false; response: Response }> {
  try {
    return { ok: true, body: await request.json() };
  } catch {
    return {
      ok: false,
      response: errorResponse(
        "Invalid JSON",
        400,
        "INVALID_JSON",
        "Request body must be valid JSON."
      ),
    };
  }
}

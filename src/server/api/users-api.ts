import { z } from "zod";
import { zNonEmptyTrimmedString } from "../../shared/lib/api-validation.ts";
import {
  errorResponse,
  readJsonBody,
  resolveAuthenticatedActor,
  validationError,
  type AuthenticatedUser,
} from "./route-handler-utils.ts";
import type { House, Member, UpsertUserRequest } from "../../types/index.ts";

const upsertUserSchema = z.object({
  name: zNonEmptyTrimmedString,
  color: zNonEmptyTrimmedString,
  email: zNonEmptyTrimmedString,
});

type PublicUser = Pick<Member, "id" | "name" | "color">;

export type GetUsersDeps = {
  listUsers: (memberUids?: string[]) => Promise<Member[]>;
  getHouse: (houseId: string) => Promise<House | null>;
  resolveActorHouseId: (uid: string) => Promise<string | null>;
  verifyRequest: (request: Request) => Promise<AuthenticatedUser>;
  unauthorizedResponse: (message?: string) => Response;
};

export type UpsertUsersDeps = {
  upsertUser: (
    uid: string,
    data: { name: string; color: string; email: string }
  ) => Promise<Member>;
  verifyRequest: (request: Request) => Promise<AuthenticatedUser>;
  unauthorizedResponse: (message?: string) => Response;
};

export async function handleGetUsers(request: Request, deps: GetUsersDeps) {
  const actor = await resolveAuthenticatedActor(request, deps);
  if (actor instanceof Response) return actor;

  const houseId = await deps.resolveActorHouseId(actor.uid);
  if (!houseId) return errorResponse("No house found for user", 403, "NO_HOUSE");
  const memberUids = (await deps.getHouse(houseId))?.memberUids ?? [];

  const users = await deps.listUsers(memberUids);
  const publicUsers: PublicUser[] = users.map(({ id, name, color }) => ({ id, name, color }));
  return Response.json({ data: publicUsers });
}

export async function handleUpsertUser(request: Request, deps: UpsertUsersDeps) {
  const actor = await resolveAuthenticatedActor(request, deps);
  if (actor instanceof Response) return actor;

  const parsedBody = await readJsonBody(request);
  if (!parsedBody.ok) return parsedBody.response;

  const parsed = upsertUserSchema.safeParse(parsedBody.body);
  if (!parsed.success) {
    return validationError("name, color, email are required", parsed.error.issues);
  }

  const requestBody: UpsertUserRequest = parsed.data;
  const created = await deps.upsertUser(actor.uid, requestBody);
  return Response.json({ data: created }, { status: 201 });
}

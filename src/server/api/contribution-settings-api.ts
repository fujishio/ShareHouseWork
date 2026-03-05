import { z } from "zod";
import type {
  ContributionSettings,
  House,
  UpdateContributionSettingsRequest,
} from "../../types/index.ts";
import {
  errorResponse,
  readJsonBody,
  resolveHouseScopedContext,
  validationError,
  type AuthenticatedUser,
} from "./route-handler-utils.ts";

const updateContributionSettingsSchema = z.object({
  monthlyAmountPerPerson: z.number().finite().positive(),
  memberCount: z.number().int().min(1),
});

function toContributionSettings(
  body: UpdateContributionSettingsRequest
): ContributionSettings {
  return {
    monthlyAmountPerPerson: body.monthlyAmountPerPerson,
    memberCount: body.memberCount,
  };
}

export type GetContributionSettingsDeps = {
  readContributionSettings: (houseId: string) => Promise<ContributionSettings>;
  getHouse: (houseId: string) => Promise<House | null>;
  resolveActorHouseId: (uid: string) => Promise<string | null>;
  verifyRequest: (request: Request) => Promise<AuthenticatedUser>;
  unauthorizedResponse: (message?: string) => Response;
};

export type UpdateContributionSettingsDeps = {
  writeContributionSettings: (houseId: string, settings: ContributionSettings) => Promise<void>;
  getHouse: (houseId: string) => Promise<House | null>;
  resolveActorHouseId: (uid: string) => Promise<string | null>;
  verifyRequest: (request: Request) => Promise<AuthenticatedUser>;
  unauthorizedResponse: (message?: string) => Response;
};

export async function handleGetContributionSettings(
  request: Request,
  deps: GetContributionSettingsDeps
) {
  const context = await resolveHouseScopedContext(request, deps);
  if (context instanceof Response) return context;

  const [settings, house] = await Promise.all([
    deps.readContributionSettings(context.houseId),
    deps.getHouse(context.houseId),
  ]);
  const canEdit = house?.ownerUid === context.actor.uid;
  return Response.json({ data: { ...settings, canEdit } });
}

export async function handleUpdateContributionSettings(
  request: Request,
  deps: UpdateContributionSettingsDeps
) {
  const context = await resolveHouseScopedContext(request, deps);
  if (context instanceof Response) return context;

  const house = await deps.getHouse(context.houseId);
  if (house?.ownerUid !== context.actor.uid) {
    return errorResponse(
      "Only the house owner can update contribution settings",
      403,
      "FORBIDDEN",
      { actorUid: context.actor.uid }
    );
  }

  const parsedBody = await readJsonBody(request);
  if (!parsedBody.ok) return parsedBody.response;

  const parsed = updateContributionSettingsSchema.safeParse(parsedBody.body);
  if (!parsed.success) {
    const firstIssue = parsed.error.issues[0];
    if (firstIssue?.path[0] === "monthlyAmountPerPerson") {
      return validationError(
        "monthlyAmountPerPerson must be a positive number",
        parsed.error.issues
      );
    }
    if (firstIssue?.path[0] === "memberCount") {
      return validationError("memberCount must be a positive integer", parsed.error.issues);
    }
    return validationError("Missing or invalid fields", parsed.error.issues);
  }
  const requestBody: UpdateContributionSettingsRequest = parsed.data;
  const input = toContributionSettings(requestBody);

  await deps.writeContributionSettings(context.houseId, input);
  return Response.json({ data: input });
}

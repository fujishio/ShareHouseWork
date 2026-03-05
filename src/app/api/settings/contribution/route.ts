import {
  readContributionSettings,
  writeContributionSettings,
} from "@/server/contribution-settings-store";
import { getHouse } from "@/server/house-store";
import { verifyRequest, unauthorizedResponse, resolveActorHouseId } from "@/server/auth";
import type { ContributionSettings } from "@/types";
import { z } from "zod";
import { errorJson, successJson } from "@/shared/lib/api-response";

const updateContributionSettingsSchema = z.object({
  monthlyAmountPerPerson: z.number().finite().positive(),
  memberCount: z.number().int().min(1),
});

export async function GET(request: Request) {
  const actor = await verifyRequest(request).catch(() => null);
  if (!actor) return unauthorizedResponse();

  const houseId = await resolveActorHouseId(actor.uid);
  if (!houseId) {
    return errorJson("No house found for user", "NO_HOUSE", 403);
  }

  const [settings, house] = await Promise.all([
    readContributionSettings(houseId),
    getHouse(houseId),
  ]);
  const canEdit = house?.ownerUid === actor.uid;
  return successJson({ ...settings, canEdit });
}

export async function POST(request: Request) {
  const actor = await verifyRequest(request).catch(() => null);
  if (!actor) return unauthorizedResponse();

  const houseId = await resolveActorHouseId(actor.uid);
  if (!houseId) {
    return errorJson("No house found for user", "NO_HOUSE", 403);
  }

  const house = await getHouse(houseId);
  if (house?.ownerUid !== actor.uid) {
    return errorJson(
      "Only the house owner can update contribution settings",
      "FORBIDDEN",
      403,
      { actorUid: actor.uid }
    );
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

  const parsed = updateContributionSettingsSchema.safeParse(body);
  if (!parsed.success) {
    const firstIssue = parsed.error.issues[0];
    if (firstIssue?.path[0] === "monthlyAmountPerPerson") {
      return errorJson(
        "monthlyAmountPerPerson must be a positive number",
        "VALIDATION_ERROR",
        400,
        parsed.error.issues
      );
    }
    if (firstIssue?.path[0] === "memberCount") {
      return errorJson(
        "memberCount must be a positive integer",
        "VALIDATION_ERROR",
        400,
        parsed.error.issues
      );
    }
    return errorJson(
      "Missing or invalid fields",
      "VALIDATION_ERROR",
      400,
      parsed.error.issues
    );
  }
  const input: ContributionSettings = parsed.data;

  await writeContributionSettings(houseId, input);
  return successJson(input);
}

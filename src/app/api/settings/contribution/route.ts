import {
  readContributionSettings,
  writeContributionSettings,
} from "@/server/contribution-settings-store";
import { verifyRequest, unauthorizedResponse } from "@/server/auth";
import { OWNER_MEMBER_NAME } from "@/shared/constants/house";
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

  const settings = await readContributionSettings();
  return successJson(settings);
}

export async function POST(request: Request) {
  const actor = await verifyRequest(request).catch(() => null);
  if (!actor) return unauthorizedResponse();

  if (actor.name !== OWNER_MEMBER_NAME) {
    return errorJson(
      "Only the house owner can update contribution settings",
      "FORBIDDEN",
      403,
      { actor: actor.name }
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

  await writeContributionSettings(input);
  return successJson(input);
}

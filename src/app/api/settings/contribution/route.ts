import { NextResponse } from "next/server";
import {
  readContributionSettings,
  writeContributionSettings,
} from "@/server/contribution-settings-store";
import { verifyRequest, unauthorizedResponse } from "@/server/auth";
import { OWNER_MEMBER_NAME } from "@/shared/constants/house";
import type { ApiErrorResponse, ContributionSettings } from "@/types";
import { z } from "zod";

const updateContributionSettingsSchema = z.object({
  monthlyAmountPerPerson: z.number().finite().positive(),
  memberCount: z.number().int().min(1),
});

export async function GET(request: Request) {
  const actor = await verifyRequest(request).catch(() => null);
  if (!actor) return unauthorizedResponse();

  const settings = await readContributionSettings();
  return NextResponse.json({ data: settings });
}

export async function POST(request: Request) {
  const actor = await verifyRequest(request).catch(() => null);
  if (!actor) return unauthorizedResponse();

  if (actor.name !== OWNER_MEMBER_NAME) {
    return NextResponse.json(
      {
        error: "Only the house owner can update contribution settings",
        code: "FORBIDDEN",
        details: { actor: actor.name },
      },
      { status: 403 }
    ) as NextResponse<ApiErrorResponse>;
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON", code: "INVALID_JSON", details: "Request body must be valid JSON." },
      { status: 400 }
    ) as NextResponse<ApiErrorResponse>;
  }

  const parsed = updateContributionSettingsSchema.safeParse(body);
  if (!parsed.success) {
    const firstIssue = parsed.error.issues[0];
    if (firstIssue?.path[0] === "monthlyAmountPerPerson") {
      return NextResponse.json(
        {
          error: "monthlyAmountPerPerson must be a positive number",
          code: "VALIDATION_ERROR",
          details: parsed.error.issues,
        },
        { status: 400 }
      ) as NextResponse<ApiErrorResponse>;
    }
    if (firstIssue?.path[0] === "memberCount") {
      return NextResponse.json(
        {
          error: "memberCount must be a positive integer",
          code: "VALIDATION_ERROR",
          details: parsed.error.issues,
        },
        { status: 400 }
      ) as NextResponse<ApiErrorResponse>;
    }
    return NextResponse.json(
      {
        error: "Missing or invalid fields",
        code: "VALIDATION_ERROR",
        details: parsed.error.issues,
      },
      { status: 400 }
    ) as NextResponse<ApiErrorResponse>;
  }
  const input: ContributionSettings = parsed.data;

  await writeContributionSettings(input);
  return NextResponse.json({ data: input });
}

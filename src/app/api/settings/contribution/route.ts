import { NextResponse } from "next/server";
import {
  readContributionSettings,
  writeContributionSettings,
} from "@/server/contribution-settings-store";
import { verifyRequest, unauthorizedResponse } from "@/server/auth";
import { OWNER_MEMBER_NAME } from "@/shared/constants/house";
import type { ContributionSettings } from "@/types";

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
      { error: "Only the house owner can update contribution settings" },
      { status: 403 }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (
    typeof body !== "object" ||
    body === null ||
    typeof (body as ContributionSettings).monthlyAmountPerPerson !== "number" ||
    typeof (body as ContributionSettings).memberCount !== "number"
  ) {
    return NextResponse.json({ error: "Missing or invalid fields" }, { status: 400 });
  }

  const input = body as ContributionSettings;

  if (input.monthlyAmountPerPerson <= 0 || !Number.isFinite(input.monthlyAmountPerPerson)) {
    return NextResponse.json(
      { error: "monthlyAmountPerPerson must be a positive number" },
      { status: 400 }
    );
  }

  if (input.memberCount < 1 || !Number.isInteger(input.memberCount)) {
    return NextResponse.json(
      { error: "memberCount must be a positive integer" },
      { status: 400 }
    );
  }

  await writeContributionSettings(input);
  return NextResponse.json({ data: input });
}

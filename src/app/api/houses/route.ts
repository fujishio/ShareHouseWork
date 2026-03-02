import { NextResponse } from "next/server";
import { createHouse, listHouses } from "@/server/house-store";
import type { ApiErrorResponse, HouseCreateResponse, HouseListResponse } from "@/types";
import { z } from "zod";
import {
  zNonEmptyTrimmedString,
  zTrimmedString,
} from "@/shared/lib/api-validation";

export const runtime = "nodejs";

const createHouseSchema = z.object({
  name: zNonEmptyTrimmedString,
  description: zTrimmedString.optional(),
  ownerUid: zTrimmedString.optional(),
  joinPassword: zTrimmedString.optional(),
});

export async function GET() {
  const houses = await listHouses();
  return NextResponse.json({ data: houses }) as NextResponse<HouseListResponse>;
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON", code: "INVALID_JSON" },
      { status: 400 }
    ) as NextResponse<ApiErrorResponse>;
  }

  const parsed = createHouseSchema.safeParse(body);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    if (issue?.path[0] === "name") {
      return NextResponse.json(
        { error: "name is required", code: "VALIDATION_ERROR", details: parsed.error.issues },
        { status: 400 }
      ) as NextResponse<ApiErrorResponse>;
    }
    return NextResponse.json(
      { error: "Invalid body", code: "VALIDATION_ERROR", details: parsed.error.issues },
      { status: 400 }
    ) as NextResponse<ApiErrorResponse>;
  }

  const created = await createHouse({
    name: parsed.data.name,
    description: parsed.data.description || undefined,
    ownerUid: parsed.data.ownerUid || undefined,
    joinPassword: parsed.data.joinPassword || undefined,
  });
  return NextResponse.json({ data: created }, { status: 201 }) as NextResponse<HouseCreateResponse>;
}

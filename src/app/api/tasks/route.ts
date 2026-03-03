import { NextResponse } from "next/server";
import { readTasks, createTask } from "@/server/task-store";
import { verifyRequest, unauthorizedResponse } from "@/server/auth";
import type { TaskCategory, CreateTaskInput, TaskListResponse, TaskCreateResponse, ApiErrorResponse } from "@/types";
import { z } from "zod";
import { zNonEmptyTrimmedString } from "@/shared/lib/api-validation";

export const runtime = "nodejs";

const VALID_CATEGORIES = [
  "炊事・洗濯",
  "水回りの掃除",
  "共用部の掃除",
  "ゴミ捨て",
  "買い出し",
  "季節・不定期",
] as const satisfies readonly TaskCategory[];

const createTaskSchema = z.object({
  name: zNonEmptyTrimmedString,
  category: z.enum(VALID_CATEGORIES),
  points: z.coerce.number().int().min(1),
  frequencyDays: z.coerce.number().int().min(1),
});

export async function GET(request: Request) {
  const actor = await verifyRequest(request).catch(() => null);
  if (!actor) return unauthorizedResponse();

  const tasks = await readTasks();
  return NextResponse.json({ data: tasks }) as NextResponse<TaskListResponse>;
}

export async function POST(request: Request) {
  const actor = await verifyRequest(request).catch(() => null);
  if (!actor) return unauthorizedResponse();

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON", code: "INVALID_JSON", details: "Request body must be valid JSON." },
      { status: 400 }
    ) as NextResponse<ApiErrorResponse>;
  }

  const parsed = createTaskSchema.safeParse(body);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    if (issue?.path[0] === "name") {
      return NextResponse.json(
        { error: "name is required", code: "VALIDATION_ERROR", details: parsed.error.issues },
        { status: 400 }
      ) as NextResponse<ApiErrorResponse>;
    }
    if (issue?.path[0] === "category") {
      return NextResponse.json(
        { error: "Invalid category", code: "VALIDATION_ERROR", details: parsed.error.issues },
        { status: 400 }
      ) as NextResponse<ApiErrorResponse>;
    }
    if (issue?.path[0] === "points") {
      return NextResponse.json(
        { error: "points must be a positive integer", code: "VALIDATION_ERROR", details: parsed.error.issues },
        { status: 400 }
      ) as NextResponse<ApiErrorResponse>;
    }
    if (issue?.path[0] === "frequencyDays") {
      return NextResponse.json(
        {
          error: "frequencyDays must be a positive integer",
          code: "VALIDATION_ERROR",
          details: parsed.error.issues,
        },
        { status: 400 }
      ) as NextResponse<ApiErrorResponse>;
    }
    return NextResponse.json(
      { error: "Invalid body", code: "VALIDATION_ERROR", details: parsed.error.issues },
      { status: 400 }
    ) as NextResponse<ApiErrorResponse>;
  }

  const input: CreateTaskInput = {
    name: parsed.data.name,
    category: parsed.data.category,
    points: parsed.data.points,
    frequencyDays: parsed.data.frequencyDays,
  };
  const created = await createTask(input);
  return NextResponse.json({ data: created }, { status: 201 }) as NextResponse<TaskCreateResponse>;
}

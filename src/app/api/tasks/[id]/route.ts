import { NextResponse } from "next/server";
import { updateTask, deleteTask } from "@/server/task-store";
import { verifyRequest, unauthorizedResponse } from "@/server/auth";
import type { TaskCategory, UpdateTaskInput, TaskUpdateResponse, TaskDeleteResponse, ApiErrorResponse } from "@/types";
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

const updateTaskSchema = z.object({
  name: zNonEmptyTrimmedString,
  category: z.enum(VALID_CATEGORIES),
  points: z.coerce.number().int().min(1),
  frequencyDays: z.coerce.number().int().min(1),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const actor = await verifyRequest(request).catch(() => null);
  if (!actor) return unauthorizedResponse();

  const { id } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON", code: "INVALID_JSON" },
      { status: 400 }
    ) as NextResponse<ApiErrorResponse>;
  }

  const parsed = updateTaskSchema.safeParse(body);
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

  const input: UpdateTaskInput = {
    name: parsed.data.name,
    category: parsed.data.category,
    points: parsed.data.points,
    frequencyDays: parsed.data.frequencyDays,
  };
  const updated = await updateTask(id, input);
  if (!updated) {
    return NextResponse.json(
      { error: "Task not found", code: "TASK_NOT_FOUND" },
      { status: 404 }
    ) as NextResponse<ApiErrorResponse>;
  }

  return NextResponse.json({ data: updated }) as NextResponse<TaskUpdateResponse>;
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const actor = await verifyRequest(request).catch(() => null);
  if (!actor) return unauthorizedResponse();

  const { id } = await params;

  const deleted = await deleteTask(id, new Date().toISOString());
  if (!deleted) {
    return NextResponse.json(
      { error: "Task not found", code: "TASK_NOT_FOUND" },
      { status: 404 }
    ) as NextResponse<ApiErrorResponse>;
  }

  return NextResponse.json({ data: deleted }) as NextResponse<TaskDeleteResponse>;
}

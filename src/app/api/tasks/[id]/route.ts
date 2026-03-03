import { updateTask, deleteTask } from "@/server/task-store";
import { verifyRequest, unauthorizedResponse } from "@/server/auth";
import type { UpdateTaskInput } from "@/types";
import { z } from "zod";
import { zNonEmptyTrimmedString } from "@/shared/lib/api-validation";
import { errorJson, successJson } from "@/shared/lib/api-response";
import { TASK_CATEGORIES } from "@/shared/constants/task";

export const runtime = "nodejs";

const updateTaskSchema = z.object({
  name: zNonEmptyTrimmedString,
  category: z.enum(TASK_CATEGORIES),
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
    return errorJson(
      "Invalid JSON",
      "INVALID_JSON",
      400,
      "Request body must be valid JSON."
    );
  }

  const parsed = updateTaskSchema.safeParse(body);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    if (issue?.path[0] === "name") {
      return errorJson("name is required", "VALIDATION_ERROR", 400, parsed.error.issues);
    }
    if (issue?.path[0] === "category") {
      return errorJson("Invalid category", "VALIDATION_ERROR", 400, parsed.error.issues);
    }
    if (issue?.path[0] === "points") {
      return errorJson(
        "points must be a positive integer",
        "VALIDATION_ERROR",
        400,
        parsed.error.issues
      );
    }
    if (issue?.path[0] === "frequencyDays") {
      return errorJson(
        "frequencyDays must be a positive integer",
        "VALIDATION_ERROR",
        400,
        parsed.error.issues
      );
    }
    return errorJson("Invalid body", "VALIDATION_ERROR", 400, parsed.error.issues);
  }

  const input: UpdateTaskInput = {
    name: parsed.data.name,
    category: parsed.data.category,
    points: parsed.data.points,
    frequencyDays: parsed.data.frequencyDays,
  };
  const updated = await updateTask(id, input);
  if (!updated) {
    return errorJson("Task not found", "TASK_NOT_FOUND", 404, { taskId: id });
  }

  return successJson(updated);
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
    return errorJson("Task not found", "TASK_NOT_FOUND", 404, { taskId: id });
  }

  return successJson(deleted);
}

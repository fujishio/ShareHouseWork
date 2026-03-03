import { readTasks, createTask } from "@/server/task-store";
import { verifyRequest, unauthorizedResponse } from "@/server/auth";
import type { CreateTaskInput } from "@/types";
import { z } from "zod";
import { zNonEmptyTrimmedString } from "@/shared/lib/api-validation";
import { errorJson, successJson } from "@/shared/lib/api-response";
import { TASK_CATEGORIES } from "@/shared/constants/task";

export const runtime = "nodejs";

const createTaskSchema = z.object({
  name: zNonEmptyTrimmedString,
  category: z.enum(TASK_CATEGORIES),
  points: z.coerce.number().int().min(1),
  frequencyDays: z.coerce.number().int().min(1),
});

export async function GET(request: Request) {
  const actor = await verifyRequest(request).catch(() => null);
  if (!actor) return unauthorizedResponse();

  const tasks = await readTasks();
  return successJson(tasks);
}

export async function POST(request: Request) {
  const actor = await verifyRequest(request).catch(() => null);
  if (!actor) return unauthorizedResponse();

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

  const parsed = createTaskSchema.safeParse(body);
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

  const input: CreateTaskInput = {
    name: parsed.data.name,
    category: parsed.data.category,
    points: parsed.data.points,
    frequencyDays: parsed.data.frequencyDays,
  };
  const created = await createTask(input);
  return successJson(created, { status: 201 });
}

import {
  zNonEmptyTrimmedString,
} from "../../shared/lib/api-validation.ts";
import { TASK_CATEGORIES } from "../../shared/constants/task.ts";
import type {
  ApiErrorResponse,
  CreateTaskInput,
  Task,
  UpdateTaskInput,
} from "../../types/index.ts";
import { z } from "zod";

type Params = { params: Promise<{ id: string }> };
type AuthenticatedUser = {
  uid: string;
  name: string;
  email: string;
};

export type GetTasksDeps = {
  readTasks: () => Promise<Task[]>;
  verifyRequest: (request: Request) => Promise<AuthenticatedUser>;
  unauthorizedResponse: (message?: string) => Response;
};

export type CreateTaskDeps = {
  createTask: (input: CreateTaskInput) => Promise<Task>;
  verifyRequest: (request: Request) => Promise<AuthenticatedUser>;
  unauthorizedResponse: (message?: string) => Response;
};

export type UpdateTaskDeps = {
  updateTask: (id: string, input: UpdateTaskInput) => Promise<Task | null>;
  verifyRequest: (request: Request) => Promise<AuthenticatedUser>;
  unauthorizedResponse: (message?: string) => Response;
};

export type DeleteTaskDeps = {
  deleteTask: (id: string, deletedAt: string) => Promise<Task | null>;
  verifyRequest: (request: Request) => Promise<AuthenticatedUser>;
  unauthorizedResponse: (message?: string) => Response;
  now: () => string;
};

const taskSchema = z.object({
  name: zNonEmptyTrimmedString,
  category: z.enum(TASK_CATEGORIES),
  points: z.coerce.number().int().min(1),
  frequencyDays: z.coerce.number().int().min(1),
});

function errorResponse(
  error: string,
  status: number,
  code: string,
  details?: unknown
) {
  return Response.json({ error, code, details } satisfies ApiErrorResponse, { status });
}

function taskValidationError(issues: z.ZodIssue[]) {
  const issue = issues[0];
  if (issue?.path[0] === "name") {
    return errorResponse("name is required", 400, "VALIDATION_ERROR", issues);
  }
  if (issue?.path[0] === "category") {
    return errorResponse("Invalid category", 400, "VALIDATION_ERROR", issues);
  }
  if (issue?.path[0] === "points") {
    return errorResponse("points must be a positive integer", 400, "VALIDATION_ERROR", issues);
  }
  if (issue?.path[0] === "frequencyDays") {
    return errorResponse(
      "frequencyDays must be a positive integer",
      400,
      "VALIDATION_ERROR",
      issues
    );
  }
  return errorResponse("Invalid body", 400, "VALIDATION_ERROR", issues);
}

export async function handleGetTasks(request: Request, deps: GetTasksDeps) {
  const actor = await deps.verifyRequest(request).catch(() => null);
  if (!actor) return deps.unauthorizedResponse();

  const tasks = await deps.readTasks();
  return Response.json({ data: tasks });
}

export async function handleCreateTask(request: Request, deps: CreateTaskDeps) {
  const actor = await deps.verifyRequest(request).catch(() => null);
  if (!actor) return deps.unauthorizedResponse();

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return errorResponse(
      "Invalid JSON",
      400,
      "INVALID_JSON",
      "Request body must be valid JSON."
    );
  }

  const parsed = taskSchema.safeParse(body);
  if (!parsed.success) {
    return taskValidationError(parsed.error.issues);
  }

  const input: CreateTaskInput = {
    name: parsed.data.name,
    category: parsed.data.category,
    points: parsed.data.points,
    frequencyDays: parsed.data.frequencyDays,
  };

  const created = await deps.createTask(input);
  return Response.json({ data: created }, { status: 201 });
}

export async function handleUpdateTask(
  request: Request,
  { params }: Params,
  deps: UpdateTaskDeps
) {
  const actor = await deps.verifyRequest(request).catch(() => null);
  if (!actor) return deps.unauthorizedResponse();

  const { id } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return errorResponse(
      "Invalid JSON",
      400,
      "INVALID_JSON",
      "Request body must be valid JSON."
    );
  }

  const parsed = taskSchema.safeParse(body);
  if (!parsed.success) {
    return taskValidationError(parsed.error.issues);
  }

  const input: UpdateTaskInput = {
    name: parsed.data.name,
    category: parsed.data.category,
    points: parsed.data.points,
    frequencyDays: parsed.data.frequencyDays,
  };

  const updated = await deps.updateTask(id, input);
  if (!updated) {
    return errorResponse("Task not found", 404, "TASK_NOT_FOUND", { taskId: id });
  }

  return Response.json({ data: updated });
}

export async function handleDeleteTask(
  request: Request,
  { params }: Params,
  deps: DeleteTaskDeps
) {
  const actor = await deps.verifyRequest(request).catch(() => null);
  if (!actor) return deps.unauthorizedResponse();

  const { id } = await params;
  const deleted = await deps.deleteTask(id, deps.now());
  if (!deleted) {
    return errorResponse("Task not found", 404, "TASK_NOT_FOUND", { taskId: id });
  }

  return Response.json({ data: deleted });
}

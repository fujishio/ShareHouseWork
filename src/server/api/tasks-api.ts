import {
  zNonEmptyTrimmedString,
} from "../../shared/lib/api-validation.ts";
import { TASK_CATEGORIES } from "../../shared/constants/task.ts";
import type {
  CreateTaskInput,
  Task,
  UpdateTaskInput,
} from "../../types/index.ts";
import { z } from "zod";
import {
  errorResponse,
  readJsonBody,
  resolveHouseScopedContext,
  type AuthenticatedUser,
} from "./route-handler-utils.ts";

type Params = { params: Promise<{ id: string }> };

export type GetTasksDeps = {
  readTasks: (houseId: string) => Promise<Task[]>;
  resolveActorHouseId: (uid: string) => Promise<string | null>;
  verifyRequest: (request: Request) => Promise<AuthenticatedUser>;
  unauthorizedResponse: (message?: string) => Response;
};

export type CreateTaskDeps = {
  createTask: (input: CreateTaskInput) => Promise<Task>;
  resolveActorHouseId: (uid: string) => Promise<string | null>;
  verifyRequest: (request: Request) => Promise<AuthenticatedUser>;
  unauthorizedResponse: (message?: string) => Response;
};

export type UpdateTaskDeps = {
  readTask: (taskId: string) => Promise<Task | null>;
  updateTask: (id: string, input: UpdateTaskInput) => Promise<Task | null>;
  resolveActorHouseId: (uid: string) => Promise<string | null>;
  verifyRequest: (request: Request) => Promise<AuthenticatedUser>;
  unauthorizedResponse: (message?: string) => Response;
};

export type DeleteTaskDeps = {
  readTask: (taskId: string) => Promise<Task | null>;
  deleteTask: (id: string, deletedAt: string) => Promise<Task | null>;
  resolveActorHouseId: (uid: string) => Promise<string | null>;
  verifyRequest: (request: Request) => Promise<AuthenticatedUser>;
  unauthorizedResponse: (message?: string) => Response;
  now: () => string;
};

const taskSchema = z.object({
  name: zNonEmptyTrimmedString.pipe(z.string().max(120)),
  category: z.enum(TASK_CATEGORIES),
  points: z.coerce.number().int().min(1),
  frequencyDays: z.coerce.number().int().min(1),
});

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
  const context = await resolveHouseScopedContext(request, deps);
  if (context instanceof Response) return context;

  const tasks = await deps.readTasks(context.houseId);
  return Response.json({ data: tasks });
}

export async function handleCreateTask(request: Request, deps: CreateTaskDeps) {
  const context = await resolveHouseScopedContext(request, deps);
  if (context instanceof Response) return context;
  const parsedBody = await readJsonBody(request);
  if (!parsedBody.ok) return parsedBody.response;

  const parsed = taskSchema.safeParse(parsedBody.body);
  if (!parsed.success) {
    return taskValidationError(parsed.error.issues);
  }

  const input: CreateTaskInput = {
    houseId: context.houseId,
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
  const context = await resolveHouseScopedContext(request, deps);
  if (context instanceof Response) return context;

  const { id } = await params;
  const targetTask = await deps.readTask(id);
  if (!targetTask || targetTask.deletedAt) {
    return errorResponse("Task not found", 404, "TASK_NOT_FOUND", { taskId: id });
  }
  if (targetTask.houseId !== context.houseId) {
    return errorResponse("Forbidden", 403, "FORBIDDEN", { taskId: id });
  }

  const parsedBody = await readJsonBody(request);
  if (!parsedBody.ok) return parsedBody.response;

  const parsed = taskSchema.safeParse(parsedBody.body);
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
  const context = await resolveHouseScopedContext(request, deps);
  if (context instanceof Response) return context;

  const { id } = await params;
  const targetTask = await deps.readTask(id);
  if (!targetTask || targetTask.deletedAt) {
    return errorResponse("Task not found", 404, "TASK_NOT_FOUND", { taskId: id });
  }
  if (targetTask.houseId !== context.houseId) {
    return errorResponse("Forbidden", 403, "FORBIDDEN", { taskId: id });
  }

  const deleted = await deps.deleteTask(id, deps.now());
  if (!deleted) {
    return errorResponse("Task not found", 404, "TASK_NOT_FOUND", { taskId: id });
  }

  return Response.json({ data: deleted });
}

import type {
  ApiErrorResponse,
  IsoDateTimeString,
  AuditLogRecord,
  Task,
  TaskCompletionRecord,
} from "../../types/index.ts";
import {
  zIsoDateTimeString,
  zNonEmptyTrimmedString,
} from "../../shared/lib/api-validation.ts";
import { z } from "zod";

type ValidSource = "app";

type AuthenticatedActor = {
  uid: string;
  name: string;
  email: string;
};

export type TaskCompletionsApiDeps = {
  readTasks: () => Promise<Task[]>;
  readTaskCompletions: () => Promise<TaskCompletionRecord[]>;
  appendTaskCompletion: (
    record: Omit<TaskCompletionRecord, "id">
  ) => Promise<TaskCompletionRecord>;
  cancelTaskCompletion: (
    completionId: string,
    canceledBy: string,
    cancelReason: string,
    canceledAt: string
  ) => Promise<TaskCompletionRecord | null>;
  appendAuditLog: (
    record: Omit<AuditLogRecord, "id">
  ) => Promise<AuditLogRecord>;
  verifyRequest: (request: Request) => Promise<AuthenticatedActor>;
  unauthorizedResponse: (message?: string) => Response;
  now: () => string;
};

export type GetTaskCompletionsDeps = Pick<
  TaskCompletionsApiDeps,
  "readTaskCompletions" | "verifyRequest" | "unauthorizedResponse"
>;

export type CreateTaskCompletionDeps = Pick<
  TaskCompletionsApiDeps,
  | "readTasks"
  | "appendTaskCompletion"
  | "appendAuditLog"
  | "verifyRequest"
  | "unauthorizedResponse"
  | "now"
>;

export type CancelTaskCompletionDeps = Pick<
  TaskCompletionsApiDeps,
  | "readTaskCompletions"
  | "cancelTaskCompletion"
  | "appendAuditLog"
  | "verifyRequest"
  | "unauthorizedResponse"
  | "now"
>;

const getTaskCompletionsQuerySchema = z.object({
  from: zIsoDateTimeString.optional(),
  to: zIsoDateTimeString.optional(),
  limit: z
    .preprocess((value) => {
      const numeric = Number(value);
      if (!Number.isFinite(numeric) || numeric <= 0) return 50;
      return numeric;
    }, z.number())
    .transform((value) => Math.min(Math.floor(value), 200))
    .default(50),
});

const createTaskCompletionSchema = z.object({
  taskId: zNonEmptyTrimmedString,
  completedAt: zIsoDateTimeString,
  source: z.literal("app"),
});

const cancelTaskCompletionSchema = z.object({
  cancelReason: zNonEmptyTrimmedString,
});

function errorResponse(
  error: string,
  status: number,
  code: string,
  details?: unknown
) {
  return Response.json({ error, code, details } satisfies ApiErrorResponse, { status });
}

export async function handleGetTaskCompletions(
  request: Request,
  deps: GetTaskCompletionsDeps
) {
  const actor = await deps.verifyRequest(request).catch(() => null);
  if (!actor) return deps.unauthorizedResponse();

  const { searchParams } = new URL(request.url);
  const queryInput: Record<string, string> = {};
  const fromRaw = searchParams.get("from");
  const toRaw = searchParams.get("to");
  const limitRaw = searchParams.get("limit");
  if (fromRaw) queryInput.from = fromRaw;
  if (toRaw) queryInput.to = toRaw;
  if (limitRaw) queryInput.limit = limitRaw;

  const parsedQuery = getTaskCompletionsQuerySchema.safeParse(queryInput);
  if (!parsedQuery.success) {
    const firstIssue = parsedQuery.error.issues[0];
    if (firstIssue?.path[0] === "from") {
      return errorResponse(
        "Invalid from query. Use ISO date string.",
        400,
        "VALIDATION_ERROR",
        parsedQuery.error.issues
      );
    }
    if (firstIssue?.path[0] === "to") {
      return errorResponse(
        "Invalid to query. Use ISO date string.",
        400,
        "VALIDATION_ERROR",
        parsedQuery.error.issues
      );
    }
    return errorResponse("Invalid limit query.", 400, "VALIDATION_ERROR", parsedQuery.error.issues);
  }

  const from = parsedQuery.data.from ? new Date(parsedQuery.data.from) : null;
  const to = parsedQuery.data.to ? new Date(parsedQuery.data.to) : null;
  const limit = parsedQuery.data.limit;

  const records = await deps.readTaskCompletions();
  const filtered = records
    .filter((record) => {
      const completedAt = new Date(record.completedAt);
      if (Number.isNaN(completedAt.getTime())) return false;
      if (from && completedAt < from) return false;
      if (to && completedAt > to) return false;
      return true;
    })
    .sort(
      (a, b) =>
        new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime()
    )
    .slice(0, limit);

  return Response.json({ data: filtered }, { status: 200 });
}

export async function handleCreateTaskCompletion(
  request: Request,
  deps: CreateTaskCompletionDeps
) {
  const actor = await deps.verifyRequest(request).catch(() => null);
  if (!actor) return deps.unauthorizedResponse();

  const rawPayload: unknown = await request.json().catch(() => null);
  const parsedPayload = createTaskCompletionSchema.safeParse(rawPayload);
  if (!parsedPayload.success) {
    return errorResponse(
      "Invalid payload. Required: taskId(string), completedAt(ISO string), source(app)",
      400,
      "VALIDATION_ERROR",
      parsedPayload.error.issues
    );
  }
  const taskId = parsedPayload.data.taskId;
  const completedAt = parsedPayload.data.completedAt as IsoDateTimeString;
  const source = parsedPayload.data.source as ValidSource;

  const tasks = await deps.readTasks();
  const task = tasks.find((item) => item.id === taskId);
  if (!task) {
    return errorResponse("taskId does not exist.", 404, "TASK_NOT_FOUND");
  }

  const created = await deps.appendTaskCompletion({
    taskId,
    taskName: task.name,
    points: task.points,
    completedBy: actor.name,
    completedAt,
    source,
  });

  await deps.appendAuditLog({
    action: "task_completion_created",
    actor: actor.name,
    source: "app",
    createdAt: deps.now(),
    details: {
      taskId: created.taskId,
      taskName: created.taskName,
      completionId: created.id,
    },
  });

  return Response.json({ data: created }, { status: 201 });
}

export async function handleCancelTaskCompletion(
  request: Request,
  context: { params: Promise<{ id: string }> },
  deps: CancelTaskCompletionDeps
) {
  const actor = await deps.verifyRequest(request).catch(() => null);
  if (!actor) return deps.unauthorizedResponse();

  const { id } = await context.params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return errorResponse("Invalid JSON", 400, "INVALID_JSON");
  }

  const parsedBody = cancelTaskCompletionSchema.safeParse(body);
  if (!parsedBody.success) {
    return errorResponse(
      "cancelReason is required.",
      400,
      "VALIDATION_ERROR",
      parsedBody.error.issues
    );
  }
  const cancelReason = parsedBody.data.cancelReason;

  const existing = (await deps.readTaskCompletions()).find(
    (record) => record.id === id
  );
  if (!existing) {
    return errorResponse("Task completion not found.", 404, "TASK_COMPLETION_NOT_FOUND");
  }

  if (existing.canceledAt) {
    return errorResponse("Task completion is already canceled.", 409, "TASK_COMPLETION_ALREADY_CANCELED");
  }

  const canceledAt = deps.now();
  const updated = await deps.cancelTaskCompletion(
    id,
    actor.name,
    cancelReason,
    canceledAt
  );

  if (!updated) {
    return errorResponse("Task completion not found.", 404, "TASK_COMPLETION_NOT_FOUND");
  }

  await deps.appendAuditLog({
    action: "task_completion_canceled",
    actor: actor.name,
    source: "app",
    createdAt: canceledAt,
    details: {
      completionId: updated.id,
      taskId: updated.taskId,
      taskName: updated.taskName,
      reason: cancelReason,
    },
  });

  return Response.json({ data: updated }, { status: 200 });
}

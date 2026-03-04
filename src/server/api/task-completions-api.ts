import type {
  ApiErrorResponse,
  AuditLogRecord,
  Task,
  TaskCompletionRecord,
} from "../../types/index.ts";
import {
  zIsoDateTimeString,
  zNonEmptyTrimmedString,
} from "../../shared/lib/api-validation.ts";
import { z } from "zod";
import { logAppAuditEvent } from "./audit-log-service.ts";

type AuthenticatedActor = {
  uid: string;
  name: string;
  email: string;
};

export type TaskCompletionsApiDeps = {
  readTasks: (houseId: string) => Promise<Task[]>;
  readTaskCompletions: (houseId: string) => Promise<TaskCompletionRecord[]>;
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
  resolveActorHouseId: (uid: string) => Promise<string | null>;
  verifyRequest: (request: Request) => Promise<AuthenticatedActor>;
  unauthorizedResponse: (message?: string) => Response;
  now: () => string;
};

export type GetTaskCompletionsDeps = Pick<
  TaskCompletionsApiDeps,
  "readTaskCompletions" | "resolveActorHouseId" | "verifyRequest" | "unauthorizedResponse"
>;

export type CreateTaskCompletionDeps = Pick<
  TaskCompletionsApiDeps,
  | "readTasks"
  | "appendTaskCompletion"
  | "appendAuditLog"
  | "resolveActorHouseId"
  | "verifyRequest"
  | "unauthorizedResponse"
  | "now"
>;

export type CancelTaskCompletionDeps = Pick<
  TaskCompletionsApiDeps,
  | "readTaskCompletions"
  | "cancelTaskCompletion"
  | "appendAuditLog"
  | "resolveActorHouseId"
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

  const houseId = await deps.resolveActorHouseId(actor.uid);
  if (!houseId) return errorResponse("No house found for user", 403, "NO_HOUSE");

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

  const records = await deps.readTaskCompletions(houseId);
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

  const houseId = await deps.resolveActorHouseId(actor.uid);
  if (!houseId) return errorResponse("No house found for user", 403, "NO_HOUSE");

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
  const { taskId, completedAt, source } = parsedPayload.data;

  const tasks = await deps.readTasks(houseId);
  const task = tasks.find((item) => item.id === taskId);
  if (!task) {
    return errorResponse("taskId does not exist.", 404, "TASK_NOT_FOUND");
  }

  const created = await deps.appendTaskCompletion({
    houseId,
    taskId,
    taskName: task.name,
    points: task.points,
    completedBy: actor.name,
    completedAt,
    source,
  });

  await logAppAuditEvent(deps, {
    houseId,
    action: "task_completion_created",
    actor: actor.name,
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

  const houseId = await deps.resolveActorHouseId(actor.uid);
  if (!houseId) return errorResponse("No house found for user", 403, "NO_HOUSE");

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

  const existing = (await deps.readTaskCompletions(houseId)).find(
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

  await logAppAuditEvent(deps, {
    houseId,
    action: "task_completion_canceled",
    actor: actor.name,
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

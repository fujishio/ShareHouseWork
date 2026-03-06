import type {
  AuditLogRecord,
  CancelTaskCompletionRequest,
  CreateTaskCompletionRequest,
  GetTaskCompletionsQuery,
  Task,
  TaskCompletionRecord,
} from "../../types/index.ts";
import {
  zIsoDateTimeString,
  zNonEmptyTrimmedString,
} from "../../shared/lib/api-validation.ts";
import { z } from "zod";
import { logAppAuditEvent } from "./audit-log-service.ts";
import { paginateByDateIdDesc } from "./cursor-pagination.ts";
import {
  errorResponse,
  readJsonBody,
  resolveHouseScopedContext,
  validationError,
  type AuthenticatedUser,
} from "./route-handler-utils.ts";

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
  verifyRequest: (request: Request) => Promise<AuthenticatedUser>;
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
  cursor: z.string().trim().min(1).optional(),
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

function toTaskCompletionRecordInput(
  body: CreateTaskCompletionRequest,
  houseId: string,
  actorName: string,
  task: Pick<Task, "id" | "name" | "points">
): Omit<TaskCompletionRecord, "id"> {
  return {
    houseId,
    taskId: task.id,
    taskName: task.name,
    points: task.points,
    completedBy: actorName,
    completedAt: body.completedAt,
    source: body.source,
  };
}

export async function handleGetTaskCompletions(
  request: Request,
  deps: GetTaskCompletionsDeps
) {
  const context = await resolveHouseScopedContext(request, deps);
  if (context instanceof Response) return context;

  const { searchParams } = new URL(request.url);
  const queryInput: Record<string, string> = {};
  const fromRaw = searchParams.get("from");
  const toRaw = searchParams.get("to");
  const limitRaw = searchParams.get("limit");
  const cursorRaw = searchParams.get("cursor");
  if (fromRaw) queryInput.from = fromRaw;
  if (toRaw) queryInput.to = toRaw;
  if (limitRaw) queryInput.limit = limitRaw;
  if (cursorRaw) queryInput.cursor = cursorRaw;

  const parsedQuery = getTaskCompletionsQuerySchema.safeParse(queryInput);
  if (!parsedQuery.success) {
    const firstIssue = parsedQuery.error.issues[0];
    if (firstIssue?.path[0] === "from") {
      return errorResponse(
        "Invalid from query. Use ISO date string",
        400,
        "VALIDATION_ERROR",
        parsedQuery.error.issues
      );
    }
    if (firstIssue?.path[0] === "to") {
      return errorResponse(
        "Invalid to query. Use ISO date string",
        400,
        "VALIDATION_ERROR",
        parsedQuery.error.issues
      );
    }
    return errorResponse("Invalid limit query", 400, "VALIDATION_ERROR", parsedQuery.error.issues);
  }

  const query: GetTaskCompletionsQuery = parsedQuery.data;
  const from = query.from ? new Date(query.from) : null;
  const to = query.to ? new Date(query.to) : null;
  const limit = query.limit;
  const cursor = query.cursor;

  const records = await deps.readTaskCompletions(context.houseId);
  const filtered = records
    .filter((record) => {
      const completedAt = new Date(record.completedAt);
      if (Number.isNaN(completedAt.getTime())) return false;
      if (from && completedAt < from) return false;
      if (to && completedAt > to) return false;
      return true;
    })
    .sort((a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime());

  const page = paginateByDateIdDesc({
    items: filtered,
    getSortKey: (record) => record.completedAt,
    getId: (record) => record.id,
    limit,
    cursor,
  });
  if (page.isInvalidCursor) {
    return errorResponse("Invalid cursor", 400, "VALIDATION_ERROR");
  }

  return Response.json({ data: page.data, page: { nextCursor: page.nextCursor } }, { status: 200 });
}

export async function handleCreateTaskCompletion(
  request: Request,
  deps: CreateTaskCompletionDeps
) {
  const context = await resolveHouseScopedContext(request, deps);
  if (context instanceof Response) return context;

  const parsedBody = await readJsonBody(request);
  if (!parsedBody.ok) return parsedBody.response;

  const parsedPayload = createTaskCompletionSchema.safeParse(parsedBody.body);
  if (!parsedPayload.success) {
    return validationError(
      "Invalid payload. Required: taskId(string), completedAt(ISO string), source(app)",
      parsedPayload.error.issues
    );
  }
  const requestBody: CreateTaskCompletionRequest = parsedPayload.data;
  const { taskId } = requestBody;

  const tasks = await deps.readTasks(context.houseId);
  const task = tasks.find((item) => item.id === taskId);
  if (!task) {
    return errorResponse("Task not found", 404, "TASK_NOT_FOUND");
  }

  const created = await deps.appendTaskCompletion(
    toTaskCompletionRecordInput(requestBody, context.houseId, context.actor.name, task)
  );

  await logAppAuditEvent(deps, {
    houseId: context.houseId,
    action: "task_completion_created",
    actor: context.actor.name,
    actorUid: context.actor.uid,
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
  routeContext: { params: Promise<{ id: string }> },
  deps: CancelTaskCompletionDeps
) {
  const authContext = await resolveHouseScopedContext(request, deps);
  if (authContext instanceof Response) return authContext;

  const { id } = await routeContext.params;

  const parsedBody = await readJsonBody(request);
  if (!parsedBody.ok) return parsedBody.response;

  const parsedCancelBody = cancelTaskCompletionSchema.safeParse(parsedBody.body);
  if (!parsedCancelBody.success) {
    return validationError(
      "cancelReason is required.",
      parsedCancelBody.error.issues
    );
  }
  const requestBody: CancelTaskCompletionRequest = parsedCancelBody.data;
  const cancelReason = requestBody.cancelReason;

  const existing = (await deps.readTaskCompletions(authContext.houseId)).find(
    (record) => record.id === id
  );
  if (!existing) {
    return errorResponse("Task completion not found", 404, "TASK_COMPLETION_NOT_FOUND");
  }

  if (existing.canceledAt) {
    return errorResponse("Task completion is already canceled", 409, "TASK_COMPLETION_ALREADY_CANCELED");
  }

  const canceledAt = deps.now();
  const updated = await deps.cancelTaskCompletion(
    id,
    authContext.actor.name,
    cancelReason,
    canceledAt
  );

  if (!updated) {
    return errorResponse("Task completion not found", 404, "TASK_COMPLETION_NOT_FOUND");
  }

  await logAppAuditEvent(deps, {
    houseId: authContext.houseId,
    action: "task_completion_canceled",
    actor: authContext.actor.name,
    actorUid: authContext.actor.uid,
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

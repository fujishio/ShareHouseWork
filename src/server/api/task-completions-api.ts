import type {
  AuditLogRecord,
  Task,
  TaskCompletionRecord,
} from "../../types/index.ts";

const VALID_SOURCES = ["app"] as const;
type ValidSource = (typeof VALID_SOURCES)[number];

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

function parseLimit(raw: string | null): number {
  if (!raw) return 50;

  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed <= 0) return 50;

  return Math.min(Math.floor(parsed), 200);
}

function parseDate(raw: string | null): Date | null {
  if (!raw) return null;

  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return null;

  return parsed;
}

export async function handleGetTaskCompletions(
  request: Request,
  deps: GetTaskCompletionsDeps
) {
  const actor = await deps.verifyRequest(request).catch(() => null);
  if (!actor) return deps.unauthorizedResponse();

  const { searchParams } = new URL(request.url);
  const from = parseDate(searchParams.get("from"));
  const to = parseDate(searchParams.get("to"));
  const limit = parseLimit(searchParams.get("limit"));

  if (searchParams.get("from") && !from) {
    return Response.json(
      { error: "Invalid from query. Use ISO date string." },
      { status: 400 }
    );
  }

  if (searchParams.get("to") && !to) {
    return Response.json(
      { error: "Invalid to query. Use ISO date string." },
      { status: 400 }
    );
  }

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
  if (typeof rawPayload !== "object" || rawPayload === null) {
    return Response.json(
      {
        error:
          "Invalid payload. Required: taskId(string), completedAt(ISO string), source(app)",
      },
      { status: 400 }
    );
  }

  const payload = rawPayload as Record<string, unknown>;

  const taskId = typeof payload.taskId === "string" ? payload.taskId : "";
  if (!taskId) {
    return Response.json(
      { error: "taskId must be a non-empty string." },
      { status: 400 }
    );
  }

  const completedAtRaw =
    typeof payload.completedAt === "string" ? payload.completedAt : "";
  const completedAt = new Date(completedAtRaw);
  if (Number.isNaN(completedAt.getTime())) {
    return Response.json(
      { error: "completedAt must be a valid ISO date string." },
      { status: 400 }
    );
  }

  const source = typeof payload.source === "string" ? payload.source : "";
  if (!VALID_SOURCES.includes(source as ValidSource)) {
    return Response.json({ error: "source must be app." }, { status: 400 });
  }

  const tasks = await deps.readTasks();
  const task = tasks.find((item) => item.id === taskId);
  if (!task) {
    return Response.json({ error: "taskId does not exist." }, { status: 404 });
  }

  const created = await deps.appendTaskCompletion({
    taskId,
    taskName: task.name,
    points: task.points,
    completedBy: actor.name,
    completedAt: completedAt.toISOString(),
    source: source as ValidSource,
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
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (typeof body !== "object" || body === null) {
    return Response.json(
      { error: "Invalid payload. Required: cancelReason(string)" },
      { status: 400 }
    );
  }

  const raw = body as Record<string, unknown>;
  const cancelReason =
    typeof raw.cancelReason === "string" ? raw.cancelReason.trim() : "";

  if (!cancelReason) {
    return Response.json({ error: "cancelReason is required." }, { status: 400 });
  }

  const existing = (await deps.readTaskCompletions()).find(
    (record) => record.id === id
  );
  if (!existing) {
    return Response.json({ error: "Task completion not found." }, { status: 404 });
  }

  if (existing.canceledAt) {
    return Response.json(
      { error: "Task completion is already canceled." },
      { status: 409 }
    );
  }

  const canceledAt = deps.now();
  const updated = await deps.cancelTaskCompletion(
    id,
    actor.name,
    cancelReason,
    canceledAt
  );

  if (!updated) {
    return Response.json({ error: "Task completion not found." }, { status: 404 });
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

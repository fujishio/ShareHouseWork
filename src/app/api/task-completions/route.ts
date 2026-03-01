import { NextResponse } from "next/server";
import { readTasks } from "@/server/task-store";
import {
  appendTaskCompletion,
  readTaskCompletions,
} from "@/server/task-completions-store";
import { appendAuditLog } from "@/server/audit-log-store";
import type {
  ApiErrorResponse,
  CreateTaskCompletionInput,
  TaskCompletionCreateResponse,
  TaskCompletionsListResponse,
  TaskCompletionSource,
} from "@/types";

export const runtime = "nodejs";

const VALID_SOURCES: TaskCompletionSource[] = ["app", "line"];

function parseLimit(raw: string | null): number {
  if (!raw) {
    return 50;
  }

  const parsed = Number(raw);

  if (!Number.isFinite(parsed) || parsed <= 0) {
    return 50;
  }

  return Math.min(Math.floor(parsed), 200);
}

function parseDate(raw: string | null): Date | null {
  if (!raw) {
    return null;
  }

  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return parsed;
}

function isCreatePayload(value: unknown): value is CreateTaskCompletionInput {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const payload = value as Record<string, unknown>;
  return (
    typeof payload.taskId === "number" &&
    typeof payload.completedBy === "string" &&
    typeof payload.completedAt === "string" &&
    typeof payload.source === "string"
  );
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const from = parseDate(searchParams.get("from"));
  const to = parseDate(searchParams.get("to"));
  const limit = parseLimit(searchParams.get("limit"));

  if (searchParams.get("from") && !from) {
    return NextResponse.json(
      { error: "Invalid from query. Use ISO date string." },
      { status: 400 }
    ) as NextResponse<ApiErrorResponse>;
  }

  if (searchParams.get("to") && !to) {
    return NextResponse.json(
      { error: "Invalid to query. Use ISO date string." },
      { status: 400 }
    ) as NextResponse<ApiErrorResponse>;
  }

  const records = await readTaskCompletions();

  const filtered = records
    .filter((record) => {
      const completedAt = new Date(record.completedAt);
      if (Number.isNaN(completedAt.getTime())) {
        return false;
      }

      if (from && completedAt < from) {
        return false;
      }

      if (to && completedAt > to) {
        return false;
      }

      return true;
    })
    .sort(
      (a, b) =>
        new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime()
    )
    .slice(0, limit);

  return NextResponse.json({ data: filtered }, { status: 200 }) as NextResponse<TaskCompletionsListResponse>;
}

export async function POST(request: Request) {
  const rawPayload: unknown = await request.json().catch(() => null);

  if (!isCreatePayload(rawPayload)) {
    return NextResponse.json(
      {
        error:
          "Invalid payload. Required: taskId(number), completedBy(string), completedAt(ISO string), source(app|line)",
      },
      { status: 400 }
    ) as NextResponse<ApiErrorResponse>;
  }

  const payload = rawPayload;

  if (!Number.isInteger(payload.taskId) || payload.taskId <= 0) {
    return NextResponse.json({ error: "taskId must be a positive integer." }, { status: 400 }) as NextResponse<ApiErrorResponse>;
  }

  if (!payload.completedBy.trim()) {
    return NextResponse.json({ error: "completedBy is required." }, { status: 400 }) as NextResponse<ApiErrorResponse>;
  }

  const completedAt = new Date(payload.completedAt);
  if (Number.isNaN(completedAt.getTime())) {
    return NextResponse.json(
      { error: "completedAt must be a valid ISO date string." },
      { status: 400 }
    ) as NextResponse<ApiErrorResponse>;
  }

  if (!VALID_SOURCES.includes(payload.source)) {
    return NextResponse.json({ error: "source must be app or line." }, { status: 400 }) as NextResponse<ApiErrorResponse>;
  }

  const tasks = await readTasks();
  const task = tasks.find((item) => item.id === payload.taskId);
  if (!task) {
    return NextResponse.json({ error: "taskId does not exist." }, { status: 404 }) as NextResponse<ApiErrorResponse>;
  }

  const created = await appendTaskCompletion({
    taskId: payload.taskId,
    taskName: task.name,
    points: task.points,
    completedBy: payload.completedBy.trim(),
    completedAt: completedAt.toISOString(),
    source: payload.source,
  });

  await appendAuditLog({
    action: "task_completion_created",
    actor: created.completedBy,
    source: created.source,
    createdAt: new Date().toISOString(),
    details: {
      taskId: created.taskId,
      taskName: created.taskName,
      completionId: created.id,
    },
  });

  return NextResponse.json({ data: created }, { status: 201 }) as NextResponse<TaskCompletionCreateResponse>;
}

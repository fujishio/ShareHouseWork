import { NextResponse } from "next/server";
import { readTasks } from "@/server/task-store";
import {
  appendTaskCompletion,
  readTaskCompletions,
} from "@/server/task-completions-store";
import { appendAuditLog } from "@/server/audit-log-store";
import { verifyRequest, unauthorizedResponse } from "@/server/auth";
import type {
  ApiErrorResponse,
  TaskCompletionCreateResponse,
  TaskCompletionsListResponse,
} from "@/types";

export const runtime = "nodejs";

const VALID_SOURCES = ["app"] as const;
type ValidSource = typeof VALID_SOURCES[number];

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

export async function GET(request: Request) {
  const actor = await verifyRequest(request).catch(() => null);
  if (!actor) return unauthorizedResponse();

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
  const actor = await verifyRequest(request).catch(() => null);
  if (!actor) return unauthorizedResponse();

  const rawPayload: unknown = await request.json().catch(() => null);

  if (typeof rawPayload !== "object" || rawPayload === null) {
    return NextResponse.json(
      {
        error:
          "Invalid payload. Required: taskId(string), completedAt(ISO string), source(app)",
      },
      { status: 400 }
    ) as NextResponse<ApiErrorResponse>;
  }

  const payload = rawPayload as Record<string, unknown>;

  const taskId = typeof payload.taskId === "string" ? payload.taskId : "";
  if (!taskId) {
    return NextResponse.json({ error: "taskId must be a non-empty string." }, { status: 400 }) as NextResponse<ApiErrorResponse>;
  }

  const completedAtRaw = typeof payload.completedAt === "string" ? payload.completedAt : "";
  const completedAt = new Date(completedAtRaw);
  if (Number.isNaN(completedAt.getTime())) {
    return NextResponse.json(
      { error: "completedAt must be a valid ISO date string." },
      { status: 400 }
    ) as NextResponse<ApiErrorResponse>;
  }

  const source = typeof payload.source === "string" ? payload.source : "";
  if (!VALID_SOURCES.includes(source as ValidSource)) {
    return NextResponse.json({ error: "source must be app." }, { status: 400 }) as NextResponse<ApiErrorResponse>;
  }

  const tasks = await readTasks();
  const task = tasks.find((item) => item.id === taskId);
  if (!task) {
    return NextResponse.json({ error: "taskId does not exist." }, { status: 404 }) as NextResponse<ApiErrorResponse>;
  }

  const created = await appendTaskCompletion({
    taskId,
    taskName: task.name,
    points: task.points,
    completedBy: actor.name,
    completedAt: completedAt.toISOString(),
    source: source as ValidSource,
  });

  await appendAuditLog({
    action: "task_completion_created",
    actor: actor.name,
    source: "app",
    createdAt: new Date().toISOString(),
    details: {
      taskId: created.taskId,
      taskName: created.taskName,
      completionId: created.id,
    },
  });

  return NextResponse.json({ data: created }, { status: 201 }) as NextResponse<TaskCompletionCreateResponse>;
}

import { NextResponse } from "next/server";
import { TASKS } from "@/domain/tasks";
import { appendTaskCompletion } from "@/server/task-completions-store";
import { appendAuditLog } from "@/server/audit-log-store";
import type {
  ApiErrorResponse,
  LineWebhookPayload,
  LineWebhookResponse,
} from "@/types";

export const runtime = "nodejs";

function isLineWebhookPayload(value: unknown): value is LineWebhookPayload {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const payload = value as Record<string, unknown>;
  return Array.isArray(payload.events);
}

export async function POST(request: Request) {
  const rawPayload: unknown = await request.json().catch(() => null);
  if (!isLineWebhookPayload(rawPayload)) {
    return NextResponse.json(
      { error: "Invalid payload. Required: { events: [...] }" },
      { status: 400 }
    ) as NextResponse<ApiErrorResponse>;
  }

  let created = 0;
  const errors: string[] = [];

  for (const [index, event] of rawPayload.events.entries()) {
    if (typeof event !== "object" || event === null) {
      errors.push(`events[${index}] is not an object`);
      continue;
    }

    const rawEvent = event as Record<string, unknown>;
    if (rawEvent.type !== "task.completed") {
      errors.push(`events[${index}] has unsupported type`);
      continue;
    }
    if (typeof rawEvent.taskId !== "number" || !Number.isInteger(rawEvent.taskId)) {
      errors.push(`events[${index}] taskId must be integer`);
      continue;
    }
    if (typeof rawEvent.completedBy !== "string" || !rawEvent.completedBy.trim()) {
      errors.push(`events[${index}] completedBy is required`);
      continue;
    }

    const task = TASKS.find((item) => item.id === rawEvent.taskId);
    if (!task) {
      errors.push(`events[${index}] taskId does not exist`);
      continue;
    }

    const completedAt =
      typeof rawEvent.completedAt === "string" &&
      !Number.isNaN(new Date(rawEvent.completedAt).getTime())
        ? new Date(rawEvent.completedAt).toISOString()
        : new Date().toISOString();

    const completion = await appendTaskCompletion({
      taskId: task.id,
      taskName: task.name,
      points: task.points,
      completedBy: rawEvent.completedBy.trim(),
      completedAt,
      source: "line",
    });

    await appendAuditLog({
      action: "line_webhook_received",
      actor: completion.completedBy,
      source: "line",
      createdAt: new Date().toISOString(),
      details: {
        eventType: "task.completed",
        completionId: completion.id,
        taskId: completion.taskId,
      },
    });

    created += 1;
  }

  return NextResponse.json(
    {
      data: {
        processed: rawPayload.events.length,
        created,
        errors,
      },
    },
    { status: 200 }
  ) as NextResponse<LineWebhookResponse>;
}

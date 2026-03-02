import { NextResponse } from "next/server";
import { appendAuditLog } from "@/server/audit-log-store";
import { cancelTaskCompletion, readTaskCompletions } from "@/server/task-completions-store";
import { verifyRequest, unauthorizedResponse } from "@/server/auth";
import type {
  ApiErrorResponse,
  TaskCompletionCancelResponse,
} from "@/types";

export const runtime = "nodejs";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const actor = await verifyRequest(request).catch(() => null);
  if (!actor) return unauthorizedResponse();

  const { id } = await context.params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON" },
      { status: 400 }
    ) as NextResponse<ApiErrorResponse>;
  }

  if (typeof body !== "object" || body === null) {
    return NextResponse.json(
      { error: "Invalid payload. Required: cancelReason(string)" },
      { status: 400 }
    ) as NextResponse<ApiErrorResponse>;
  }

  const raw = body as Record<string, unknown>;
  const cancelReason = typeof raw.cancelReason === "string" ? raw.cancelReason.trim() : "";

  if (!cancelReason) {
    return NextResponse.json(
      { error: "cancelReason is required." },
      { status: 400 }
    ) as NextResponse<ApiErrorResponse>;
  }

  const existing = (await readTaskCompletions()).find((record) => record.id === id);
  if (!existing) {
    return NextResponse.json(
      { error: "Task completion not found." },
      { status: 404 }
    ) as NextResponse<ApiErrorResponse>;
  }

  if (existing.canceledAt) {
    return NextResponse.json(
      { error: "Task completion is already canceled." },
      { status: 409 }
    ) as NextResponse<ApiErrorResponse>;
  }

  const canceledAt = new Date().toISOString();
  const updated = await cancelTaskCompletion(
    id,
    actor.name,
    cancelReason,
    canceledAt
  );

  if (!updated) {
    return NextResponse.json(
      { error: "Task completion not found." },
      { status: 404 }
    ) as NextResponse<ApiErrorResponse>;
  }

  await appendAuditLog({
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

  return NextResponse.json(
    { data: updated },
    { status: 200 }
  ) as NextResponse<TaskCompletionCancelResponse>;
}

import { NextResponse } from "next/server";
import { appendAuditLog } from "@/server/audit-log-store";
import { cancelTaskCompletion, readTaskCompletions } from "@/server/task-completions-store";
import type {
  ApiErrorResponse,
  TaskCompletionCancelResponse,
} from "@/types";

export const runtime = "nodejs";

type CancelPayload = {
  canceledBy: string;
  cancelReason: string;
};

function isCancelPayload(value: unknown): value is CancelPayload {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const payload = value as Record<string, unknown>;
  return (
    typeof payload.canceledBy === "string" &&
    typeof payload.cancelReason === "string"
  );
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const completionId = Number(id);

  if (!Number.isInteger(completionId) || completionId <= 0) {
    return NextResponse.json(
      { error: "id must be a positive integer." },
      { status: 400 }
    ) as NextResponse<ApiErrorResponse>;
  }

  const payloadRaw: unknown = await request.json().catch(() => null);
  if (!isCancelPayload(payloadRaw)) {
    return NextResponse.json(
      { error: "Invalid payload. Required: canceledBy(string), cancelReason(string)" },
      { status: 400 }
    ) as NextResponse<ApiErrorResponse>;
  }

  const canceledBy = payloadRaw.canceledBy.trim();
  const cancelReason = payloadRaw.cancelReason.trim();

  if (!canceledBy) {
    return NextResponse.json(
      { error: "canceledBy is required." },
      { status: 400 }
    ) as NextResponse<ApiErrorResponse>;
  }

  if (!cancelReason) {
    return NextResponse.json(
      { error: "cancelReason is required." },
      { status: 400 }
    ) as NextResponse<ApiErrorResponse>;
  }

  const existing = (await readTaskCompletions()).find((record) => record.id === completionId);
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
    completionId,
    canceledBy,
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
    actor: canceledBy,
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

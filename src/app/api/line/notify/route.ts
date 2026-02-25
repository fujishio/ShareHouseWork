import { NextResponse } from "next/server";
import { appendAuditLog } from "@/server/audit-log-store";
import type {
  ApiErrorResponse,
  LineNotifyInput,
  LineNotifyResponse,
} from "@/types";

export const runtime = "nodejs";

function isLineNotifyInput(value: unknown): value is LineNotifyInput {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const payload = value as Record<string, unknown>;
  if (typeof payload.message !== "string") {
    return false;
  }
  if (
    payload.level !== undefined &&
    payload.level !== "normal" &&
    payload.level !== "important"
  ) {
    return false;
  }
  return true;
}

export async function POST(request: Request) {
  const rawPayload: unknown = await request.json().catch(() => null);
  if (!isLineNotifyInput(rawPayload)) {
    return NextResponse.json(
      { error: "Invalid payload. Required: message(string), level?(normal|important)" },
      { status: 400 }
    ) as NextResponse<ApiErrorResponse>;
  }

  const message = rawPayload.message.trim();
  if (!message) {
    return NextResponse.json(
      { error: "message cannot be empty" },
      { status: 400 }
    ) as NextResponse<ApiErrorResponse>;
  }

  const level = rawPayload.level ?? "normal";
  const queuedAt = new Date().toISOString();

  await appendAuditLog({
    action: "line_notification_queued",
    actor: "system",
    source: "app",
    createdAt: queuedAt,
    details: {
      level,
      message,
      channel: "line",
    },
  });

  return NextResponse.json(
    { data: { queued: true, queuedAt } },
    { status: 200 }
  ) as NextResponse<LineNotifyResponse>;
}

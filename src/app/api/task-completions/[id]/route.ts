import { handleCancelTaskCompletion } from "@/server/api/task-completions-api";
import { appendAuditLog } from "@/server/audit-log-store";
import { verifyRequest, unauthorizedResponse } from "@/server/auth";
import {
  cancelTaskCompletion,
  readTaskCompletions,
} from "@/server/task-completions-store";

export const runtime = "nodejs";

const deps = {
  readTaskCompletions,
  cancelTaskCompletion,
  appendAuditLog,
  verifyRequest,
  unauthorizedResponse,
  now: () => new Date().toISOString(),
};

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  return handleCancelTaskCompletion(request, context, deps);
}

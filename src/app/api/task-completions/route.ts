import {
  handleCreateTaskCompletion,
  handleGetTaskCompletions,
} from "@/server/api/task-completions-api";
import { appendAuditLog } from "@/server/audit-log-store";
import { verifyRequest, unauthorizedResponse, resolveActorHouseId } from "@/server/auth";
import {
  appendTaskCompletion,
  readTaskCompletions,
} from "@/server/task-completions-store";
import { readTasks } from "@/server/task-store";

export const runtime = "nodejs";

const deps = {
  readTasks,
  readTaskCompletions,
  appendTaskCompletion,
  appendAuditLog,
  resolveActorHouseId,
  verifyRequest,
  unauthorizedResponse,
  now: () => new Date().toISOString(),
};

export async function GET(request: Request) {
  return handleGetTaskCompletions(request, deps);
}

export async function POST(request: Request) {
  return handleCreateTaskCompletion(request, deps);
}

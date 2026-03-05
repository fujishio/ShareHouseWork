import { handleGetAuditLogs } from "@/server/api/audit-logs-api";
import { createAuditLogCursor, readAuditLogs } from "@/server/audit-log-store";
import { verifyRequest, unauthorizedResponse, resolveActorHouseId } from "@/server/auth";

export const runtime = "nodejs";

const deps = {
  readAuditLogs,
  createAuditLogCursor,
  resolveActorHouseId,
  verifyRequest,
  unauthorizedResponse,
};

export async function GET(request: Request) {
  return handleGetAuditLogs(request, deps);
}

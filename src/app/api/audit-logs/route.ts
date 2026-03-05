import { handleGetAuditLogs } from "@/server/api/audit-logs-api";
import { readAuditLogs } from "@/server/audit-log-store";
import { verifyRequest, unauthorizedResponse, resolveActorHouseId } from "@/server/auth";

export const runtime = "nodejs";

const deps = {
  readAuditLogs,
  resolveActorHouseId,
  verifyRequest,
  unauthorizedResponse,
};

export async function GET(request: Request) {
  return handleGetAuditLogs(request, deps);
}

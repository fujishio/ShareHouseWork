import { readAuditLogs } from "@/server/audit-log-store";
import { verifyRequest, unauthorizedResponse } from "@/server/auth";
import { z } from "zod";
import { errorJson, successJson } from "@/shared/lib/api-response";

export const runtime = "nodejs";

const auditLogQuerySchema = z.object({
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
  action: z.string().trim().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(500).optional().default(100),
});

export async function GET(request: Request) {
  const actor = await verifyRequest(request).catch(() => null);
  if (!actor) return unauthorizedResponse();

  const { searchParams } = new URL(request.url);
  const parsedQuery = auditLogQuerySchema.safeParse({
    from: searchParams.get("from") ?? undefined,
    to: searchParams.get("to") ?? undefined,
    action: searchParams.get("action") ?? undefined,
    limit: searchParams.get("limit") ?? undefined,
  });
  if (!parsedQuery.success) {
    return errorJson(
      "Invalid query parameters. from/to must be valid dates; limit must be 1-500.",
      "VALIDATION_ERROR",
      400,
      parsedQuery.error.issues
    );
  }
  const { from, to, action, limit } = parsedQuery.data;

  const logs = await readAuditLogs();
  const filtered = logs
    .filter((log) => {
      const createdAt = new Date(log.createdAt);
      if (Number.isNaN(createdAt.getTime())) {
        return false;
      }
      if (action && log.action !== action) {
        return false;
      }
      if (from && createdAt < from) {
        return false;
      }
      if (to && createdAt > to) {
        return false;
      }
      return true;
    })
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, limit);

  return successJson(filtered, { status: 200 });
}

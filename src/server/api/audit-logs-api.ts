import { z } from "zod";
import type { AuditLogRecord } from "../../types/index.ts";
import {
  resolveHouseScopedContext,
  validationError,
  type AuthenticatedUser,
} from "./route-handler-utils.ts";

const auditLogQuerySchema = z.object({
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
  action: z.string().trim().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(500).optional().default(100),
});

export type GetAuditLogsDeps = {
  readAuditLogs: (
    houseId: string,
    options: { from?: Date; to?: Date; action?: string; limit?: number }
  ) => Promise<AuditLogRecord[]>;
  resolveActorHouseId: (uid: string) => Promise<string | null>;
  verifyRequest: (request: Request) => Promise<AuthenticatedUser>;
  unauthorizedResponse: (message?: string) => Response;
};

export async function handleGetAuditLogs(request: Request, deps: GetAuditLogsDeps) {
  const context = await resolveHouseScopedContext(request, deps);
  if (context instanceof Response) return context;

  const { searchParams } = new URL(request.url);
  const parsedQuery = auditLogQuerySchema.safeParse({
    from: searchParams.get("from") ?? undefined,
    to: searchParams.get("to") ?? undefined,
    action: searchParams.get("action") ?? undefined,
    limit: searchParams.get("limit") ?? undefined,
  });
  if (!parsedQuery.success) {
    return validationError(
      "Invalid query parameters. from/to must be valid dates; limit must be 1-500.",
      parsedQuery.error.issues
    );
  }
  const { from, to, action, limit } = parsedQuery.data;

  const logs = await deps.readAuditLogs(context.houseId, { from, to, action, limit });
  return Response.json({ data: logs }, { status: 200 });
}

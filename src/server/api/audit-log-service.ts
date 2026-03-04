import type { AuditLogRecord } from "../../types/index.ts";

type AppendAuditLog = (record: Omit<AuditLogRecord, "id">) => Promise<AuditLogRecord>;

export type AuditLogDeps = {
  appendAuditLog: AppendAuditLog;
  now: () => string;
};

export async function logAppAuditEvent(
  deps: AuditLogDeps,
  input: {
    houseId: string;
    action: AuditLogRecord["action"];
    actor: string;
    details: AuditLogRecord["details"];
    createdAt?: string;
  }
): Promise<AuditLogRecord> {
  return deps.appendAuditLog({
    houseId: input.houseId,
    action: input.action,
    actor: input.actor,
    source: "app",
    createdAt: input.createdAt ?? deps.now(),
    details: input.details,
  });
}

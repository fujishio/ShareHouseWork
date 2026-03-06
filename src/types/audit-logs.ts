import type { IsoDateTimeString } from "./primitives";

export type AuditAction =
  | "task_completion_created"
  | "task_completion_canceled"
  | "expense_created"
  | "expense_canceled"
  | "balance_adjustment_created"
  | "shopping_created"
  | "shopping_checked"
  | "shopping_unchecked"
  | "shopping_canceled"
  | "rule_created"
  | "rule_updated"
  | "rule_acknowledged"
  | "rule_deleted"
  | "notice_created"
  | "notice_deleted";

export type AuditLogRecord = {
  id: string;
  houseId: string;
  action: AuditAction;
  actor: string;
  actorUid: string;
  source: "app" | "system";
  createdAt: IsoDateTimeString;
  details: Record<string, string | number | boolean | null>;
};

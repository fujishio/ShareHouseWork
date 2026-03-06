import type { AuditAction } from "./audit-logs";
import type { ExpenseCategory } from "./expenses";
import type { RuleCategory } from "./rules";
import type { TaskCompletionSource } from "./task-completions";
import type { TaskCategory } from "./tasks";

type Nullable<T> = T | null;

export type FirestoreMemberDoc = {
  name: string;
  color: string;
  email?: string;
};

export type FirestoreHouseDoc = {
  name: string;
  description: Nullable<string>;
  ownerUid: Nullable<string>;
  memberUids: string[];
  hostUids: string[];
  createdAt: string;
  joinPasswordHash?: string;
};

export type FirestoreTaskDoc = {
  houseId: string;
  name: string;
  category: TaskCategory;
  points: number;
  frequencyDays: number;
  displayOrder?: number;
  deletedAt: Nullable<string>;
};

export type FirestoreTaskCompletionDoc = {
  houseId: string;
  taskId: string;
  taskName: string;
  points: number;
  completedBy: string;
  completedAt: string;
  source: TaskCompletionSource;
  canceledAt: Nullable<string>;
  canceledBy: Nullable<string>;
  cancelReason: Nullable<string>;
};

export type FirestoreExpenseDoc = {
  houseId: string;
  title: string;
  amount: number;
  category: ExpenseCategory;
  purchasedBy: string;
  purchasedAt: string;
  canceledAt: Nullable<string>;
  canceledBy: Nullable<string>;
  cancelReason: Nullable<string>;
};

export type FirestoreBalanceAdjustmentDoc = {
  houseId: string;
  amount: number;
  reason: string;
  adjustedBy: string;
  adjustedAt: string;
};

export type FirestoreShoppingItemDoc = {
  houseId: string;
  name: string;
  quantity: string;
  memo: string;
  category: Nullable<ExpenseCategory>;
  addedBy: string;
  addedAt: string;
  checkedBy: Nullable<string>;
  checkedAt: Nullable<string>;
  canceledAt: Nullable<string>;
  canceledBy: Nullable<string>;
};

export type FirestoreNoticeDoc = {
  houseId: string;
  title: string;
  body: string;
  postedBy: string;
  postedAt: string;
  isImportant: boolean;
  deletedAt: Nullable<string>;
  deletedBy: Nullable<string>;
};

export type FirestoreRuleDoc = {
  houseId: string;
  title: string;
  body: string;
  category: RuleCategory;
  createdBy: string;
  createdAt: string;
  updatedAt: Nullable<string>;
  acknowledgedBy: string[];
  deletedAt: Nullable<string>;
  deletedBy: Nullable<string>;
};

export type FirestoreContributionSettingsDoc = {
  houseId: string;
  effectiveMonth: string;
  monthlyAmountPerPerson: number;
  memberCount: number;
};

export type FirestoreAuditLogDoc = {
  houseId: string;
  action: AuditAction;
  actor: string;
  actorUid: string;
  source: "app" | "system";
  createdAt: string;
  details: Record<string, string | number | boolean | null>;
};

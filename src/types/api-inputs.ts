import type { ExpenseCategory } from "./expenses";
import type { RuleCategory } from "./rules";
import type { TaskCategory } from "./tasks";
import type { IsoDateString, IsoDateTimeString } from "./primitives";

export type CursorPaginationQuery = {
  cursor?: string;
  limit: number;
};

export type MonthFilterQuery = {
  month?: string;
};

export type GetAuditLogsQuery = {
  from?: Date;
  to?: Date;
  action?: string;
  cursor?: string;
  limit: number;
};

export type GetMonthlyExportQuery = {
  month?: string;
};

export type CreateHouseRequest = {
  name: string;
  description?: string;
  joinPassword?: string;
};

export type JoinHouseRequest = {
  houseName: string;
  joinPassword: string;
};

export type AddHouseMemberRequest = {
  userUid: string;
};

export type UpdateHouseRoleRequest = {
  userUid: string;
  action: "grant" | "revoke";
};

export type UpsertUserRequest = {
  name: string;
  color: string;
  email: string;
};

export type PatchProfileRequest = {
  color: string;
};

export type UpdateContributionSettingsRequest = {
  monthlyAmountPerPerson: number;
  memberCount: number;
};

export type CreateTaskRequest = {
  name: string;
  category: TaskCategory;
  points: number;
  frequencyDays: number;
};

export type CreateRuleRequest = {
  title: string;
  body: string;
  category: RuleCategory;
};

export type UpdateRuleRequest = CreateRuleRequest;

export type CreateExpenseRequest = {
  title: string;
  amount: number;
  category: ExpenseCategory;
  purchasedAt: IsoDateString;
};

export type DeleteExpenseRequest = {
  cancelReason: string;
};

export type CreateShoppingItemRequest = {
  name: string;
  quantity: string;
  memo: string;
  category?: ExpenseCategory;
  addedAt: IsoDateString;
};

export type PatchShoppingItemRequest = {
  uncheck?: boolean;
};

export type CreateNoticeRequest = {
  title: string;
  body: string;
  isImportant: boolean;
};

export type CreateBalanceAdjustmentRequest = {
  amount: number;
  reason: string;
  adjustedAt: IsoDateString;
};

export type GetTaskCompletionsQuery = {
  from?: IsoDateTimeString;
  to?: IsoDateTimeString;
  cursor?: string;
  limit: number;
};

export type CreateTaskCompletionRequest = {
  taskId: string;
  completedAt: IsoDateTimeString;
  source: "app";
};

export type CancelTaskCompletionRequest = {
  cancelReason: string;
};

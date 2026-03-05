import type { ApiSuccessResponse } from "./api";
import type { AuditLogRecord } from "./audit-logs";
import type { BalanceAdjustmentRecord } from "./balance-adjustments";
import type { ContributionSettings } from "./contribution-settings";
import type { ExpenseRecord } from "./expenses";
import type { House } from "./houses";
import type { Member } from "./members";
import type { Notice } from "./notices";
import type { Rule } from "./rules";
import type { ShoppingItem } from "./shopping";
import type { TaskCompletionRecord } from "./task-completions";
import type { Task } from "./tasks";

export type TaskCompletionsListResponse = ApiSuccessResponse<TaskCompletionRecord[]>;
export type TaskCompletionCreateResponse = ApiSuccessResponse<TaskCompletionRecord>;
export type TaskCompletionCancelResponse = ApiSuccessResponse<TaskCompletionRecord>;

export type AuditLogsListResponse = ApiSuccessResponse<AuditLogRecord[]>;

export type ShoppingItemListResponse = ApiSuccessResponse<ShoppingItem[]>;
export type ShoppingItemCreateResponse = ApiSuccessResponse<ShoppingItem>;
export type ShoppingItemCheckResponse = ApiSuccessResponse<ShoppingItem>;

export type ExpenseListResponse = ApiSuccessResponse<ExpenseRecord[]>;
export type ExpenseCreateResponse = ApiSuccessResponse<ExpenseRecord>;
export type ExpenseCancelResponse = ApiSuccessResponse<ExpenseRecord>;
export type ContributionSettingsResponse = ApiSuccessResponse<ContributionSettings>;

export type BalanceAdjustmentListResponse = ApiSuccessResponse<BalanceAdjustmentRecord[]>;
export type BalanceAdjustmentCreateResponse = ApiSuccessResponse<BalanceAdjustmentRecord>;

export type NoticeListResponse = ApiSuccessResponse<Notice[]>;
export type NoticeCreateResponse = ApiSuccessResponse<Notice>;
export type NoticeDeleteResponse = ApiSuccessResponse<Notice>;

export type HouseCreateResponse = ApiSuccessResponse<House>;
export type HouseListResponse = ApiSuccessResponse<House[]>;
export type HouseMemberAddResponse = ApiSuccessResponse<House>;
export type UserListResponse = ApiSuccessResponse<Member[]>;

export type RuleListResponse = ApiSuccessResponse<Rule[]>;
export type RuleCreateResponse = ApiSuccessResponse<Rule>;
export type RuleUpdateResponse = ApiSuccessResponse<Rule>;
export type RuleDeleteResponse = ApiSuccessResponse<Rule>;

export type TaskListResponse = ApiSuccessResponse<Task[]>;
export type TaskCreateResponse = ApiSuccessResponse<Task>;
export type TaskUpdateResponse = ApiSuccessResponse<Task>;
export type TaskDeleteResponse = ApiSuccessResponse<Task>;

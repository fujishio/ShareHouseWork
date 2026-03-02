export type IsoDateString = string;
export type MoneyYen = number;
export type HousePoints = number;

export type Member = {
  id: string; // Firebase Auth UID
  name: string;
  color: string; // Tailwind color class or hex for chart
  email?: string;
};

export type House = {
  id: string;
  name: string;
  description?: string;
  ownerUid?: string;
  memberUids: string[];
  createdAt: IsoDateString;
};

export type TaskCompletion = {
  id: string;
  taskId: string;
  taskName: string;
  points: HousePoints;
  completedBy: string;
  completedAt: IsoDateString;
  source: TaskCompletionSource;
};

export type TaskCompletionSource = "app";

export type TaskCompletionRecord = {
  id: string;
  taskId: string;
  taskName: string;
  points: HousePoints;
  completedBy: string;
  completedAt: IsoDateString;
  source: TaskCompletionSource;
  canceledAt?: IsoDateString;
  canceledBy?: string;
  cancelReason?: string;
};

export type CreateTaskCompletionInput = {
  taskId: string;
  completedBy: string;
  completedAt: IsoDateString;
  source: TaskCompletionSource;
};

export type ApiErrorResponse = {
  error: string;
};

export type ApiSuccessResponse<T> = {
  data: T;
};

export type TaskCompletionsListResponse = ApiSuccessResponse<TaskCompletionRecord[]>;
export type TaskCompletionCreateResponse = ApiSuccessResponse<TaskCompletionRecord>;
export type TaskCompletionCancelResponse = ApiSuccessResponse<TaskCompletionRecord>;

export type AuditAction =
  | "task_completion_created"
  | "task_completion_canceled"
  | "rule_created"
  | "rule_updated"
  | "rule_acknowledged"
  | "rule_deleted"
  | "notice_created"
  | "notice_deleted";

export type AuditLogRecord = {
  id: string;
  action: AuditAction;
  actor: string;
  source: "app" | "system";
  createdAt: IsoDateString;
  details: Record<string, string | number | boolean | null>;
};

export type AuditLogsListResponse = ApiSuccessResponse<AuditLogRecord[]>;

export type ContributionData = {
  member: Member;
  totalPoints: HousePoints;
};

export type ExpenseSummary = {
  month: string;
  totalContributed: MoneyYen;
  totalSpent: MoneyYen;
  balance: MoneyYen;
};

export type ExpenseCategory =
  | "水道・光熱費"
  | "食費"
  | "消耗品"
  | "日用品"
  | "その他";

export type ExpenseRecord = {
  id: string;
  title: string;
  amount: MoneyYen;
  category: ExpenseCategory;
  purchasedBy: string;
  purchasedAt: IsoDateString;
  canceledAt?: IsoDateString;
  canceledBy?: string;
  cancelReason?: string;
};

export type CreateExpenseInput = {
  title: string;
  amount: MoneyYen;
  category: ExpenseCategory;
  purchasedBy: string;
  purchasedAt: IsoDateString;
};

export type CancelExpenseInput = {
  canceledBy: string;
  cancelReason: string;
};

export type ContributionSettings = {
  monthlyAmountPerPerson: MoneyYen;
  memberCount: number;
};

export type ContributionSettingsHistoryRecord = ContributionSettings & {
  effectiveMonth: string; // YYYY-MM
};

export type ShoppingItem = {
  id: string;
  name: string;
  quantity: string;
  memo: string;
  category?: ExpenseCategory;
  addedBy: string;
  addedAt: IsoDateString;
  checkedBy?: string;
  checkedAt?: IsoDateString;
  canceledAt?: IsoDateString;
  canceledBy?: string;
};

export type CreateShoppingItemInput = {
  name: string;
  quantity: string;
  memo: string;
  category?: ExpenseCategory;
  addedBy: string;
  addedAt: IsoDateString;
};

export type CheckShoppingItemInput = {
  checkedBy: string;
};

export type ShoppingItemListResponse = ApiSuccessResponse<ShoppingItem[]>;
export type ShoppingItemCreateResponse = ApiSuccessResponse<ShoppingItem>;
export type ShoppingItemCheckResponse = ApiSuccessResponse<ShoppingItem>;

export type ExpenseListResponse = ApiSuccessResponse<ExpenseRecord[]>;
export type ExpenseCreateResponse = ApiSuccessResponse<ExpenseRecord>;
export type ExpenseCancelResponse = ApiSuccessResponse<ExpenseRecord>;
export type ContributionSettingsResponse = ApiSuccessResponse<ContributionSettings>;

export type Notice = {
  id: string;
  title: string;
  body: string;
  postedBy: string;
  postedAt: IsoDateString;
  isImportant: boolean;
  deletedAt?: IsoDateString;
  deletedBy?: string;
};

export type CreateNoticeInput = {
  title: string;
  body: string;
  postedBy: string;
  postedAt: IsoDateString;
  isImportant: boolean;
};

export type NoticeListResponse = ApiSuccessResponse<Notice[]>;
export type NoticeCreateResponse = ApiSuccessResponse<Notice>;
export type NoticeDeleteResponse = ApiSuccessResponse<Notice>;

export type HouseCreateResponse = ApiSuccessResponse<House>;
export type HouseListResponse = ApiSuccessResponse<House[]>;
export type HouseMemberAddResponse = ApiSuccessResponse<House>;
export type UserListResponse = ApiSuccessResponse<Member[]>;

export type RuleCategory =
  | "ゴミ捨て"
  | "騒音"
  | "共用部"
  | "来客"
  | "その他";

export type Rule = {
  id: string;
  title: string;
  body: string;
  category: RuleCategory;
  createdBy: string;
  createdAt: IsoDateString;
  updatedAt?: IsoDateString;
  acknowledgedBy?: string[];
  deletedAt?: IsoDateString;
  deletedBy?: string;
};

export type CreateRuleInput = {
  title: string;
  body: string;
  category: RuleCategory;
  createdBy: string;
  createdAt: IsoDateString;
};

export type UpdateRuleInput = {
  title: string;
  body: string;
  category: RuleCategory;
  updatedAt: IsoDateString;
};

export type RuleListResponse = ApiSuccessResponse<Rule[]>;
export type RuleCreateResponse = ApiSuccessResponse<Rule>;
export type RuleUpdateResponse = ApiSuccessResponse<Rule>;
export type RuleDeleteResponse = ApiSuccessResponse<Rule>;

export type NotificationSettings = {
  enabled: boolean;
  importantOnly: boolean;
};

export type TaskCategory =
  | "炊事・洗濯"
  | "水回りの掃除"
  | "共用部の掃除"
  | "ゴミ捨て"
  | "買い出し"
  | "季節・不定期";

export type Task = {
  id: string;
  name: string;
  points: HousePoints; // configurable house points (current mock uses 10-50)
  category: TaskCategory;
  frequencyDays: number; // ideal interval between completions
  deletedAt?: IsoDateString;
};

export type CreateTaskInput = {
  name: string;
  category: TaskCategory;
  points: HousePoints;
  frequencyDays: number;
};

export type UpdateTaskInput = {
  name: string;
  category: TaskCategory;
  points: HousePoints;
  frequencyDays: number;
};

export type TaskListResponse = ApiSuccessResponse<Task[]>;
export type TaskCreateResponse = ApiSuccessResponse<Task>;
export type TaskUpdateResponse = ApiSuccessResponse<Task>;
export type TaskDeleteResponse = ApiSuccessResponse<Task>;

export type PrioritizedTask = Task & {
  lastCompletedAt: Date | null;
  overdueDays: number; // positive = overdue, negative = days remaining, 0 = due today
  urgencyRatio: number; // daysSince / frequencyDays, higher = more urgent
};

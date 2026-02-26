export type IsoDateString = string;
export type MoneyYen = number;
export type HousePoints = number;

export type Member = {
  id: number;
  name: string;
  color: string; // Tailwind color class or hex for chart
};

export type TaskCompletion = {
  id: number;
  taskId?: number;
  taskName: string;
  points: HousePoints;
  completedBy: string;
  completedAt: Date;
  source: "app" | "line";
};

export type TaskCompletionSource = "app" | "line";

export type TaskCompletionRecord = {
  id: number;
  taskId: number;
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
  taskId: number;
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
  | "line_webhook_received"
  | "line_notification_queued";

export type AuditLogRecord = {
  id: number;
  action: AuditAction;
  actor: string;
  source: "app" | "line" | "system";
  createdAt: IsoDateString;
  details: Record<string, string | number | boolean | null>;
};

export type AuditLogsListResponse = ApiSuccessResponse<AuditLogRecord[]>;

export type LineWebhookTaskCompletedEvent = {
  type: "task.completed";
  taskId: number;
  completedBy: string;
  completedAt?: IsoDateString;
};

export type LineWebhookPayload = {
  events: LineWebhookTaskCompletedEvent[];
};

export type LineWebhookResult = {
  processed: number;
  created: number;
  errors: string[];
};

export type LineWebhookResponse = ApiSuccessResponse<LineWebhookResult>;

export type LineNotifyInput = {
  message: string;
  level?: "normal" | "important";
};

export type LineNotifyResult = {
  queued: boolean;
  queuedAt: IsoDateString;
};

export type LineNotifyResponse = ApiSuccessResponse<LineNotifyResult>;

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
  id: number;
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
  id: number;
  name: string;
  quantity: string;
  memo: string;
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
  id: number;
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

export type RuleCategory =
  | "ゴミ捨て"
  | "騒音"
  | "共用部"
  | "来客"
  | "その他";

export type Rule = {
  id: number;
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
  id: number;
  name: string;
  points: HousePoints; // configurable house points (current mock uses 10-50)
  category: TaskCategory;
  frequencyDays: number; // ideal interval between completions
};

export type PrioritizedTask = Task & {
  lastCompletedAt: Date | null;
  overdueDays: number; // positive = overdue, negative = days remaining, 0 = due today
  urgencyRatio: number; // daysSince / frequencyDays, higher = more urgent
};

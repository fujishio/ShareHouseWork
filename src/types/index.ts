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

export type AuditAction =
  | "task_completion_created"
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

export type Notice = {
  id: number;
  title: string;
  postedBy: string;
  postedAt: Date;
  isImportant: boolean;
};

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

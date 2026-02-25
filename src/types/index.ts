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

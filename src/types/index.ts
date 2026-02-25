export type Member = {
  id: number;
  name: string;
  color: string; // Tailwind color class or hex for chart
};

export type TaskCompletion = {
  id: number;
  taskId?: number;
  taskName: string;
  points: number;
  completedBy: string;
  completedAt: Date;
  source: "app" | "line";
};

export type TaskCompletionSource = "app" | "line";

export type TaskCompletionRecord = {
  id: number;
  taskId: number;
  taskName: string;
  points: number;
  completedBy: string;
  completedAt: string;
  source: TaskCompletionSource;
};

export type CreateTaskCompletionInput = {
  taskId: number;
  completedBy: string;
  completedAt: string;
  source: TaskCompletionSource;
};

export type ContributionData = {
  member: Member;
  totalPoints: number;
};

export type ExpenseSummary = {
  month: string;
  totalContributed: number;
  totalSpent: number;
  balance: number;
};

export type Notice = {
  id: number;
  title: string;
  postedBy: string;
  postedAt: Date;
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
  points: number; // configurable house points (current mock uses 10-50)
  category: TaskCategory;
  frequencyDays: number; // ideal interval between completions
};

export type PrioritizedTask = Task & {
  lastCompletedAt: Date | null;
  overdueDays: number; // positive = overdue, negative = days remaining, 0 = due today
  urgencyRatio: number; // daysSince / frequencyDays, higher = more urgent
};

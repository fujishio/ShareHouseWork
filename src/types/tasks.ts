import type { HousePoints, IsoDateTimeString } from "./primitives";

export type TaskCategory =
  | "炊事・洗濯"
  | "水回りの掃除"
  | "共用部の掃除"
  | "ゴミ捨て"
  | "買い出し"
  | "季節・不定期";

export type Task = {
  id: string;
  houseId: string;
  name: string;
  points: HousePoints; // configurable house points (current mock uses 10-50)
  category: TaskCategory;
  frequencyDays: number; // ideal interval between completions
  deletedAt?: IsoDateTimeString;
};

export type CreateTaskInput = {
  houseId: string;
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

export type PrioritizedTask = Task & {
  lastCompletedAt: Date | null;
  overdueDays: number; // positive = overdue, negative = days remaining, 0 = due today
  urgencyRatio: number; // daysSince / frequencyDays, higher = more urgent
};

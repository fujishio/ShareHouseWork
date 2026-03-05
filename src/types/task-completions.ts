import type { HousePoints, IsoDateTimeString } from "./primitives";

export type TaskCompletionSource = "app";

export type TaskCompletion = {
  id: string;
  houseId: string;
  taskId: string;
  taskName: string;
  points: HousePoints;
  completedBy: string;
  completedAt: IsoDateTimeString;
  source: TaskCompletionSource;
};

export type TaskCompletionRecord = {
  id: string;
  houseId: string;
  taskId: string;
  taskName: string;
  points: HousePoints;
  completedBy: string;
  completedAt: IsoDateTimeString;
  source: TaskCompletionSource;
  canceledAt?: IsoDateTimeString;
  canceledBy?: string;
  cancelReason?: string;
};

export type CreateTaskCompletionInput = {
  houseId: string;
  taskId: string;
  completedBy: string;
  completedAt: IsoDateTimeString;
  source: TaskCompletionSource;
};

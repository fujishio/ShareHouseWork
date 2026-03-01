import type { TaskCompletionRecord } from "@/types";

export function getLatestCompletionByTask(
  records: TaskCompletionRecord[]
): Record<number, Date | null> {
  const latest: Record<number, Date | null> = {};
  for (const record of records) {
    if (record.canceledAt) continue;
    const completedAt = new Date(record.completedAt);
    if (Number.isNaN(completedAt.getTime())) continue;
    const current = latest[record.taskId];
    if (!current || completedAt > current) {
      latest[record.taskId] = completedAt;
    }
  }
  return latest;
}

import type { PrioritizedTask } from "@/types";
import { TASKS } from "@/domain/tasks/task-definitions";

const MS_PER_DAY = 1000 * 60 * 60 * 24;

export function getPrioritizedTasks(
  lastCompletions: Record<number, Date | null>,
  now: Date,
  limit = 5
): PrioritizedTask[] {
  return TASKS.map((task) => {
    const lastCompletedAt = lastCompletions[task.id] ?? null;

    let urgencyRatio: number;
    let overdueDays: number;

    if (lastCompletedAt === null) {
      urgencyRatio = 1.0;
      overdueDays = 0;
    } else {
      const daysSince = (now.getTime() - lastCompletedAt.getTime()) / MS_PER_DAY;
      urgencyRatio = daysSince / task.frequencyDays;
      overdueDays = Math.round(daysSince - task.frequencyDays);
    }

    return { ...task, lastCompletedAt, overdueDays, urgencyRatio };
  })
    .sort((a, b) => b.urgencyRatio - a.urgencyRatio)
    .slice(0, limit);
}

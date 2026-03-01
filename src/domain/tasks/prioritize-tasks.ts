import type { PrioritizedTask, Task } from "../../types/index.ts";
import { TASKS } from "./task-definitions.ts";

const MS_PER_DAY = 1000 * 60 * 60 * 24;

export function getPrioritizedTasks(
  lastCompletions: Record<number, Date | null>,
  now: Date,
  limit = 5,
  tasks: Task[] = TASKS
): PrioritizedTask[] {
  return tasks.map((task) => {
    const lastCompletedAt = lastCompletions[task.id] ?? null;

    let urgencyRatio: number;
    let overdueDays: number;

    if (lastCompletedAt === null) {
      // No completion record means the task should surface first.
      urgencyRatio = Number.POSITIVE_INFINITY;
      overdueDays = task.frequencyDays;
    } else {
      const daysSince = (now.getTime() - lastCompletedAt.getTime()) / MS_PER_DAY;
      urgencyRatio = daysSince / task.frequencyDays;
      overdueDays = Math.floor(daysSince) - task.frequencyDays;
    }

    return { ...task, lastCompletedAt, overdueDays, urgencyRatio };
  })
    .sort((a, b) => {
      if (b.urgencyRatio !== a.urgencyRatio) {
        return b.urgencyRatio - a.urgencyRatio;
      }
      if (b.overdueDays !== a.overdueDays) {
        return b.overdueDays - a.overdueDays;
      }
      if (a.frequencyDays !== b.frequencyDays) {
        return a.frequencyDays - b.frequencyDays;
      }
      return a.id - b.id;
    })
    .slice(0, limit);
}

import type { Task, TaskCategory, PrioritizedTask } from "@/types";

/**
 * Task definitions grouped by category.
 *
 * To add/edit tasks:
 *   1. Add an entry under the appropriate category below
 *   2. Set points from 1 (light) to 5 (heavy)
 *   3. Set frequencyDays: ideal interval between completions
 *
 * Points guide:
 *   1 = light task (< 5 min)
 *   2 = normal task (5–15 min)
 *   3 = moderate task (15–30 min)
 *   4 = heavy task (30–60 min)
 *   5 = very heavy task (60 min+ or special effort)
 */
const TASK_DEFINITIONS: Record<TaskCategory, { name: string; points: number; frequencyDays: number }[]> = {
    "炊事・洗濯": [
    { name: "【料理】共有の食事", points: 20, frequencyDays: 3 },
    { name: "【料理】洗い物・片付け", points: 20, frequencyDays: 1 },
    { name: "【キッチン】排水溝ネット交換", points: 10, frequencyDays: 14 },
    { name: "【キッチン】生ゴミ捨て", points: 10, frequencyDays: 3 },
    { name: "【洗濯】共有カゴの洗濯", points: 20, frequencyDays: 7 },
    { name: "【洗濯】干す・取り込む", points: 20, frequencyDays: 3 },
    { name: "【洗濯】洗剤・柔軟剤の補充", points: 10, frequencyDays: 30 },
  ],
  "水回りの掃除": [
    { name: "【風呂】浴槽の掃除", points: 20, frequencyDays: 7 },
    { name: "【風呂】床・壁の掃除", points: 20, frequencyDays: 7 },
    { name: "【風呂】排水口の掃除", points: 20, frequencyDays: 14 },
    { name: "【洗面所】洗面台の掃除", points: 10, frequencyDays: 7 },
    { name: "【洗面所】床の掃除", points: 10, frequencyDays: 7 },
    { name: "【トイレ】掃除", points: 30, frequencyDays: 7 },
    { name: "【トイレ】トイレットペーパー補充", points: 10, frequencyDays: 7 },
    { name: "【風呂】シャンプー類の補充", points: 10, frequencyDays: 30 },
  ],
  "共用部の掃除": [
    { name: "コンロ周りの掃除", points: 30, frequencyDays: 7 },
    { name: "リビングの掃除機がけ", points: 30, frequencyDays: 3 },
    { name: "廊下・階段の掃除機がけ", points: 30, frequencyDays: 7 },
    { name: "テーブル・棚の拭き掃除", points: 10, frequencyDays: 7 },
    { name: "玄関外の掃き掃除", points: 30, frequencyDays: 7 },
   ],
  "ゴミ捨て": [
    { name: "ゴミ出し（可燃）", points: 20, frequencyDays: 7 },
    { name: "ゴミ出し（資源・不燃）", points: 20, frequencyDays: 14 },
  ],
  "買い出し": [
    { name: "スーパーでの買い出し", points: 30, frequencyDays: 7 },
    { name: "ドラッグストアでの買い出し", points: 30, frequencyDays: 14 },
  ],
  "季節・不定期": [
    { name: "換気扇の掃除", points: 50, frequencyDays: 180 },
    { name: "エアコンフィルター掃除", points: 30, frequencyDays: 90 },
    { name: "排水口の大掃除", points: 30, frequencyDays: 90 },
  ],
};

// Build flat TASKS array with auto-incremented IDs
let nextId = 1;
export const TASKS: Task[] = Object.entries(TASK_DEFINITIONS).flatMap(
  ([category, tasks]) =>
    tasks.map((t) => ({
      id: nextId++,
      name: t.name,
      points: t.points,
      category: category as TaskCategory,
      frequencyDays: t.frequencyDays,
    }))
);

const MS_PER_DAY = 1000 * 60 * 60 * 24;

/**
 * Returns tasks sorted by urgency (most overdue first).
 * @param lastCompletions  Map of task ID → last completion date (null if never done)
 * @param now              Reference date for calculations
 * @param limit            Number of tasks to return
 */
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
      // Never completed: treat as exactly at deadline (urgency = 1.0)
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

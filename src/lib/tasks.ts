import type { Task, TaskCategory } from "@/types";

/**
 * Task definitions grouped by category.
 *
 * To add/edit tasks:
 *   1. Add an entry under the appropriate category below
 *   2. Set points from 1 (light) to 5 (heavy)
 *
 * Points guide:
 *   1 = light task (< 5 min)
 *   2 = normal task (5–15 min)
 *   3 = moderate task (15–30 min)
 *   4 = heavy task (30–60 min)
 *   5 = very heavy task (60 min+ or special effort)
 */
const TASK_DEFINITIONS: Record<TaskCategory, { name: string; points: number }[]> = {
  浴室: [
    { name: "浴室掃除（床・浴槽）", points: 4 },
    { name: "排水口の掃除", points: 3 },
  ],
  トイレ: [
    { name: "トイレ掃除", points: 2 },
    { name: "トイレットペーパー補充", points: 1 },
  ],
  キッチン: [
    { name: "流し台の洗い物・片付け", points: 2 },
    { name: "コンロ周りの掃除", points: 2 },
    { name: "冷蔵庫の整理・期限チェック", points: 2 },
    { name: "料理（共有の食事）", points: 4 },
  ],
  リビング: [
    { name: "リビングの掃除機がけ", points: 2 },
    { name: "テーブル・棚の拭き掃除", points: 1 },
  ],
  洗面所: [
    { name: "洗面台の掃除", points: 1 },
    { name: "洗濯機を回す", points: 1 },
    { name: "洗濯物を干す・取り込む", points: 2 },
  ],
  玄関: [
    { name: "玄関の掃き掃除", points: 1 },
  ],
  ゴミ: [
    { name: "ゴミ出し（可燃）", points: 1 },
    { name: "ゴミ出し（資源・不燃）", points: 2 },
    { name: "粗大ゴミの手配・搬出", points: 5 },
  ],
  買い出し: [
    { name: "スーパーでの買い出し", points: 3 },
    { name: "ドラッグストアでの買い出し", points: 2 },
  ],
  "季節・不定期": [
    { name: "換気扇の掃除", points: 4 },
    { name: "エアコンフィルター掃除", points: 3 },
    { name: "排水口の大掃除", points: 4 },
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
    }))
);

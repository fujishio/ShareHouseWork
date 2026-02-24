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
    "炊事・洗濯": [
    { name: "【料理】共有の食事", points: 20 },
    { name: "【料理】洗い物・片付け", points: 20 },
    { name: "【キッチン】排水溝ネット交換", points: 10 },
    { name: "【キッチン】生ゴミ捨て", points: 10 },
    { name: "【洗濯】共有カゴの洗濯", points: 20 },
    { name: "【洗濯】干す・取り込む", points: 20 },
    { name: "【洗濯】洗剤・柔軟剤の補充", points: 10 },
  ],
  "水回りの掃除": [
    { name: "【風呂】浴槽の掃除", points: 20 },
    { name: "【風呂】床・壁の掃除", points: 20 },
    { name: "【風呂】排水口の掃除", points: 20 },
    { name: "【洗面所】洗面台の掃除", points: 10 },
    { name: "【洗面所】床の掃除", points: 10 },
    { name: "【トイレ】掃除", points: 30 },
    { name: "【トイレ】トイレットペーパー補充", points: 10 },
    { name: "【風呂】シャンプー類の補充", points: 10 },
  ],
  "共用部の掃除": [
    { name: "コンロ周りの掃除", points: 30 },
    { name: "リビングの掃除機がけ", points: 30 },
    { name: "廊下・階段の掃除機がけ", points: 30 },
    { name: "テーブル・棚の拭き掃除", points: 10 },
    { name: "玄関外の掃き掃除", points: 30 },
   ],
  "ゴミ捨て": [
    { name: "ゴミ出し（可燃）", points: 20 },
    { name: "ゴミ出し（資源・不燃）", points: 20 },
  ],
  "買い出し": [
    { name: "スーパーでの買い出し", points: 30 },
    { name: "ドラッグストアでの買い出し", points: 30 },
  ],
  "季節・不定期": [
    { name: "換気扇の掃除", points: 50 },
    { name: "エアコンフィルター掃除", points: 30 },
    { name: "排水口の大掃除", points: 30 },
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

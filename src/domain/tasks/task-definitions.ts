import type { Task, TaskCategory } from "../../types/index.ts";

export const TASK_DEFINITIONS: Record<
  TaskCategory,
  { name: string; points: number; frequencyDays: number }[]
> = {
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
    {
      name: "【トイレ】トイレットペーパー補充",
      points: 10,
      frequencyDays: 7,
    },
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

let nextTaskId = 1;
export const TASKS: Task[] = Object.entries(TASK_DEFINITIONS).flatMap(
  ([category, tasks]) =>
    tasks.map((task) => ({
      id: nextTaskId++,
      name: task.name,
      points: task.points,
      category: category as TaskCategory,
      frequencyDays: task.frequencyDays,
    }))
);

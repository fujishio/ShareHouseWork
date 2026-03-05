import type { Task, TaskCategory } from "../../types/index.ts";
import { TASK_CATEGORIES } from "../../shared/constants/task.ts";

type TaskDefinition = {
  name: string;
  points: number;
  frequencyDays: number;
  displayOrder: number;
};

export const TASK_DEFINITIONS: Record<
  TaskCategory,
  TaskDefinition[]
> = {
  "炊事・洗濯": [
    { name: "【料理】共有の食事", points: 20, frequencyDays: 3, displayOrder: 0 },
    { name: "【料理】洗い物・片付け", points: 20, frequencyDays: 1, displayOrder: 1 },
    { name: "【キッチン】排水溝ネット交換", points: 10, frequencyDays: 14, displayOrder: 2 },
    { name: "【キッチン】生ゴミ捨て", points: 10, frequencyDays: 3, displayOrder: 3 },
    { name: "【洗濯】共有カゴの洗濯", points: 20, frequencyDays: 7, displayOrder: 4 },
    { name: "【洗濯】干す・取り込む", points: 20, frequencyDays: 3, displayOrder: 5 },
    { name: "【洗濯】洗剤・柔軟剤の補充", points: 10, frequencyDays: 30, displayOrder: 6 },
  ],
  "水回りの掃除": [
    { name: "【風呂】浴槽の掃除", points: 20, frequencyDays: 7, displayOrder: 0 },
    { name: "【風呂】床・壁の掃除", points: 20, frequencyDays: 7, displayOrder: 1 },
    { name: "【風呂】排水口の掃除", points: 20, frequencyDays: 14, displayOrder: 2 },
    { name: "【洗面所】洗面台の掃除", points: 10, frequencyDays: 7, displayOrder: 3 },
    { name: "【洗面所】床の掃除", points: 10, frequencyDays: 7, displayOrder: 4 },
    { name: "【トイレ】掃除", points: 30, frequencyDays: 7, displayOrder: 5 },
    { name: "【トイレ】トイレットペーパー補充", points: 10, frequencyDays: 7, displayOrder: 6 },
    { name: "【風呂】シャンプー類の補充", points: 10, frequencyDays: 30, displayOrder: 7 },
  ],
  "共用部の掃除": [
    { name: "【キッチン】コンロ周りの掃除", points: 30, frequencyDays: 7, displayOrder: 0 },
    { name: "【キッチン】コンロ五徳・油受けの洗浄", points: 30, frequencyDays: 14, displayOrder: 1 },
    { name: "【キッチン】電子レンジの掃除", points: 20, frequencyDays: 14, displayOrder: 2 },
    { name: "【キッチン】グリル掃除", points: 30, frequencyDays: 14, displayOrder: 3 },
    { name: "【リビング】掃除機がけ", points: 30, frequencyDays: 3, displayOrder: 4 },
    { name: "【リビング】ソファの水拭き", points: 20, frequencyDays: 30, displayOrder: 5 },
    { name: "【リビング】テーブルの水拭き", points: 10, frequencyDays: 7, displayOrder: 6 },
    { name: "【廊下・階段】掃除機がけ", points: 30, frequencyDays: 7, displayOrder: 7 },
    { name: "【玄関外】掃除", points: 20, frequencyDays: 7, displayOrder: 8 },
    { name: "【ベランダ】掃除", points: 20, frequencyDays: 30, displayOrder: 9 },
  ],
  "ゴミ捨て": [
    { name: "【ゴミ出し】可燃", points: 20, frequencyDays: 7, displayOrder: 0 },
    { name: "【ゴミ出し】資源・不燃", points: 20, frequencyDays: 14, displayOrder: 1 },
    { name: "【掃除機】ダストカップ掃除", points: 20, frequencyDays: 7, displayOrder: 2 },
    { name: "【掃除機】フィルター掃除", points: 20, frequencyDays: 14, displayOrder: 3 },
  ],
  "買い出し": [
    { name: "【買い出し】スーパー", points: 30, frequencyDays: 7, displayOrder: 0 },
    { name: "【買い出し】ドラッグストア", points: 30, frequencyDays: 14, displayOrder: 1 },
  ],
  "季節・不定期": [
    { name: "換気扇の掃除", points: 50, frequencyDays: 180, displayOrder: 0 },
    { name: "エアコンフィルター掃除", points: 30, frequencyDays: 90, displayOrder: 1 },
    { name: "排水口の大掃除", points: 30, frequencyDays: 90, displayOrder: 2 },
    { name: "窓ガラス・網戸の掃除", points: 30, frequencyDays: 90, displayOrder: 3 },
  ],
};

let nextTaskId = 1;
export const TASKS: Task[] = TASK_CATEGORIES.flatMap((category) =>
  TASK_DEFINITIONS[category].map((task) => ({
    id: String(nextTaskId++),
    houseId: "",
    name: task.name,
    points: task.points,
    category,
    frequencyDays: task.frequencyDays,
    displayOrder: task.displayOrder,
  }))
);

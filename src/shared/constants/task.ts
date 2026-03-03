import type { TaskCategory } from "../../types/index.ts";

export const TASK_CATEGORIES = [
  "炊事・洗濯",
  "水回りの掃除",
  "共用部の掃除",
  "ゴミ捨て",
  "買い出し",
  "季節・不定期",
] as const satisfies readonly TaskCategory[];

export function isTaskCategory(value: string): value is TaskCategory {
  return TASK_CATEGORIES.some((category) => category === value);
}

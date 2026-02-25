import type {
  Member,
  TaskCompletion,
  ContributionData,
  ExpenseSummary,
  Notice,
  PrioritizedTask,
} from "@/types";
import { getPrioritizedTasks } from "@/lib/tasks";

export const MEMBERS: Member[] = [
  { id: 1, name: "家主", color: "#d97706" },
  { id: 2, name: "パートナー", color: "#57534e" },
  { id: 3, name: "友達１", color: "#059669" },
  { id: 4, name: "友達２", color: "#db2777" },
];

const now = new Date("2026-02-24T12:00:00");

const hoursAgo = (h: number) => new Date(now.getTime() - h * 60 * 60 * 1000);
const daysAgo = (d: number) => new Date(now.getTime() - d * 24 * 60 * 60 * 1000);

export const RECENT_COMPLETIONS: TaskCompletion[] = [
  {
    id: 1,
    taskName: "浴室掃除（床・浴槽）",
    points: 4,
    completedBy: "あなた",
    completedAt: hoursAgo(2),
    source: "app",
  },
  {
    id: 2,
    taskName: "ゴミ出し（可燃）",
    points: 1,
    completedBy: "パートナー",
    completedAt: hoursAgo(5),
    source: "line",
  },
  {
    id: 3,
    taskName: "流し台の洗い物・片付け",
    points: 2,
    completedBy: "友達１",
    completedAt: daysAgo(1),
    source: "app",
  },
  {
    id: 4,
    taskName: "リビングの掃除機がけ",
    points: 2,
    completedBy: "友達２",
    completedAt: daysAgo(1),
    source: "app",
  },
];

export const CONTRIBUTION_DATA: ContributionData[] = [
  { member: MEMBERS[0], totalPoints: 42 },
  { member: MEMBERS[1], totalPoints: 36 },
  { member: MEMBERS[2], totalPoints: 26 },
  { member: MEMBERS[3], totalPoints: 16 },
];

// Current user is member[0] (家主)
export const CURRENT_USER = MEMBERS[0];
export const MY_RANK = 1;

export const EXPENSE_SUMMARY: ExpenseSummary = {
  month: "2026年2月",
  totalContributed: 60000, // 4人 × ¥15,000
  totalSpent: 42500,
  balance: 17500,
};

// Last completion dates per task ID (null = never completed)
// Task IDs correspond to the order defined in tasks.ts:
//   1=共有の食事, 2=洗い物, 3=排水溝ネット, 4=生ゴミ, 5=共有洗濯, 6=干す取り込む, 7=洗剤補充
//   8=浴槽, 9=風呂床壁, 10=風呂排水口, 11=洗面台, 12=洗面所床, 13=トイレ, 14=トイレットペーパー, 15=シャンプー
//   16=コンロ, 17=リビング掃除機, 18=廊下階段, 19=テーブル拭き, 20=玄関
//   21=可燃ゴミ, 22=資源ゴミ, 23=スーパー, 24=ドラッグストア
//   25=換気扇, 26=エアコン, 27=排水口大掃除
const TASK_LAST_COMPLETIONS: Record<number, Date | null> = {
  2:  daysAgo(3),   // 洗い物: 2日超過 (freq=1)
  4:  daysAgo(4),   // 生ゴミ: 1日超過 (freq=3)
  8:  daysAgo(10),  // 浴槽: 3日超過 (freq=7)
  13: daysAgo(11),  // トイレ: 4日超過 (freq=7)
  17: daysAgo(3),   // リビング掃除機: 今日が期限 (freq=3)
  21: daysAgo(10),  // 可燃ゴミ: 3日超過 (freq=7)
  1:  daysAgo(2),   // 共有の食事: 1日後 (freq=3)
  5:  daysAgo(6),   // 共有洗濯: 1日後 (freq=7)
  6:  daysAgo(2),   // 干す取り込む: 1日後 (freq=3)
  9:  daysAgo(5),   // 風呂床壁: 2日後 (freq=7)
  11: daysAgo(5),   // 洗面台: 2日後 (freq=7)
  12: daysAgo(5),   // 洗面所床: 2日後 (freq=7)
  16: daysAgo(4),   // コンロ: 3日後 (freq=7)
  18: daysAgo(4),   // 廊下階段: 3日後 (freq=7)
  19: daysAgo(4),   // テーブル拭き: 3日後 (freq=7)
  20: daysAgo(4),   // 玄関: 3日後 (freq=7)
  22: daysAgo(10),  // 資源ゴミ: 4日後 (freq=14)
  23: daysAgo(5),   // スーパー: 2日後 (freq=7)
  24: daysAgo(10),  // ドラッグストア: 4日後 (freq=14)
  14: daysAgo(3),   // トイレットペーパー: 4日後 (freq=7)
  10: daysAgo(7),   // 風呂排水口: 7日後 (freq=14)
  3:  daysAgo(5),   // 排水溝ネット: 9日後 (freq=14)
  7:  daysAgo(10),  // 洗剤補充: 20日後 (freq=30)
  15: daysAgo(10),  // シャンプー補充: 20日後 (freq=30)
  25: daysAgo(60),  // 換気扇: 120日後 (freq=180)
  26: daysAgo(30),  // エアコン: 60日後 (freq=90)
  27: daysAgo(30),  // 排水口大掃除: 60日後 (freq=90)
};

export const PRIORITY_TASKS: PrioritizedTask[] = getPrioritizedTasks(
  TASK_LAST_COMPLETIONS,
  now
);

export const RECENT_NOTICES: Notice[] = [
  {
    id: 1,
    title: "来週、水道工事があります（2/27 AM）",
    postedBy: "家主",
    postedAt: daysAgo(1),
  },
  {
    id: 2,
    title: "トイレットペーパーが残り少ないです",
    postedBy: "友達１",
    postedAt: daysAgo(2),
  },
];

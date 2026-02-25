import { getPrioritizedTasks } from "@/domain/tasks";
import type {
  ContributionData,
  ExpenseSummary,
  Member,
  Notice,
  PrioritizedTask,
  TaskCompletion,
} from "@/types";

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

export const CURRENT_USER = MEMBERS[0];
export const MY_RANK = 1;

export const EXPENSE_SUMMARY: ExpenseSummary = {
  month: "2026年2月",
  totalContributed: 60000,
  totalSpent: 42500,
  balance: 17500,
};

const TASK_LAST_COMPLETIONS: Record<number, Date | null> = {
  2: daysAgo(3),
  4: daysAgo(4),
  8: daysAgo(10),
  13: daysAgo(11),
  17: daysAgo(3),
  21: daysAgo(10),
  1: daysAgo(2),
  5: daysAgo(6),
  6: daysAgo(2),
  9: daysAgo(5),
  11: daysAgo(5),
  12: daysAgo(5),
  16: daysAgo(4),
  18: daysAgo(4),
  19: daysAgo(4),
  20: daysAgo(4),
  22: daysAgo(10),
  23: daysAgo(5),
  24: daysAgo(10),
  14: daysAgo(3),
  10: daysAgo(7),
  3: daysAgo(5),
  7: daysAgo(10),
  15: daysAgo(10),
  25: daysAgo(60),
  26: daysAgo(30),
  27: daysAgo(30),
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

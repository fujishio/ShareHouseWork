import type {
  Member,
  TaskCompletion,
  ContributionData,
  ExpenseSummary,
  Notice,
  ScheduleEvent,
} from "@/types";

export const MEMBERS: Member[] = [
  { id: 1, name: "あなた（家主）", color: "#10b981" },
  { id: 2, name: "パートナー", color: "#3b82f6" },
  { id: 3, name: "友達１", color: "#f59e0b" },
  { id: 4, name: "友達２", color: "#ec4899" },
];

const now = new Date("2026-02-24T12:00:00");

const hoursAgo = (h: number) => new Date(now.getTime() - h * 60 * 60 * 1000);
const daysAgo = (d: number) => new Date(now.getTime() - d * 24 * 60 * 60 * 1000);

export const RECENT_COMPLETIONS: TaskCompletion[] = [
  {
    id: 1,
    taskName: "浴室掃除（床・浴槽）",
    points: 3,
    completedBy: "あなた",
    completedAt: hoursAgo(2),
    source: "app",
  },
  {
    id: 2,
    taskName: "ゴミ出し",
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
  { member: MEMBERS[0], totalPoints: 42, percentage: 35 },
  { member: MEMBERS[1], totalPoints: 36, percentage: 30 },
  { member: MEMBERS[2], totalPoints: 26, percentage: 22 },
  { member: MEMBERS[3], totalPoints: 16, percentage: 13 },
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

export const THIS_WEEK_EVENTS: ScheduleEvent[] = [
  {
    id: 1,
    memberName: "友達２",
    memberColor: "#ec4899",
    label: "旅行",
    startDate: new Date("2026-02-25"),
    endDate: new Date("2026-02-27"),
  },
  {
    id: 2,
    memberName: "友達１",
    memberColor: "#f59e0b",
    label: "来客",
    startDate: new Date("2026-02-26"),
    endDate: new Date("2026-02-26"),
  },
];

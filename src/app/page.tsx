import ContributionWidget from "@/components/ContributionWidget";
import ExpenseWidget from "@/components/ExpenseWidget";
import NoticesWidget from "@/components/NoticesWidget";
import RecentTasksWidget from "@/components/RecentTasksWidget";
import { getPrioritizedTasks, getLatestCompletionByTask } from "@/domain/tasks";
import { calculateMonthlyExpenseSummary } from "@/domain/expenses/calculate-monthly-expense-summary";
import { readTaskCompletions } from "@/server/task-completions-store";
import { readExpenses } from "@/server/expense-store";
import { readContributionSettingsHistory } from "@/server/contribution-settings-store";
import { readNotices } from "@/server/notice-store";
import { formatJpDate, getGreeting, toJstMonthKey } from "@/shared/lib/time";
import { HOUSE_MEMBERS, CURRENT_USER_ID } from "@/shared/constants/house";
import type { ContributionData, TaskCompletionRecord } from "@/types";

const MS_PER_DAY = 1000 * 60 * 60 * 24;

function toLabelFromMonthKey(monthKey: string): string {
  const [year, month] = monthKey.split("-");
  return `${year}年${Number(month)}月`;
}

function computeContributionData(records: TaskCompletionRecord[], now: Date): ContributionData[] {
  const thirtyDaysAgo = new Date(now.getTime() - 30 * MS_PER_DAY);
  const pointsByName: Record<string, number> = {};

  for (const record of records) {
    if (record.canceledAt) continue;
    const completedAt = new Date(record.completedAt);
    if (Number.isNaN(completedAt.getTime())) continue;
    if (completedAt < thirtyDaysAgo) continue;
    pointsByName[record.completedBy] = (pointsByName[record.completedBy] ?? 0) + record.points;
  }

  return HOUSE_MEMBERS
    .map((member) => ({
      member,
      totalPoints: pointsByName[member.name] ?? 0,
    }))
    .sort((a, b) => b.totalPoints - a.totalPoints);
}

export default async function HomePage() {
  const now = new Date();
  const currentMonthKey = toJstMonthKey(now);

  const [completions, allExpenses, contributionHistory, allNotices] = await Promise.all([
    readTaskCompletions(),
    readExpenses(),
    readContributionSettingsHistory(),
    readNotices(),
  ]);

  const latestByTask = getLatestCompletionByTask(completions);
  const priorityTasks = getPrioritizedTasks(latestByTask, now);

  const contributionData = computeContributionData(completions, now);
  const myContribution = contributionData.find((d) => d.member.id === CURRENT_USER_ID);
  const myRank = contributionData.findIndex((d) => d.member.id === CURRENT_USER_ID) + 1;

  const summary = calculateMonthlyExpenseSummary(currentMonthKey, allExpenses, contributionHistory);
  const expenseSummary = {
    month: toLabelFromMonthKey(currentMonthKey),
    totalContributed: summary.monthlyContribution,
    totalSpent: summary.monthlySpent,
    balance: summary.balance,
  };

  const notices = allNotices
    .filter((n) => !n.deletedAt)
    .sort((a, b) => new Date(b.postedAt).getTime() - new Date(a.postedAt).getTime())
    .slice(0, 5);

  const currentUser = HOUSE_MEMBERS.find((m) => m.id === CURRENT_USER_ID) ?? HOUSE_MEMBERS[0];

  return (
    <div className="space-y-4">
      {/* Greeting */}
      <div className="pt-1">
        <p className="text-stone-400 text-sm">{formatJpDate()}</p>
        <h2 className="text-xl font-bold text-stone-800 mt-0.5">
          {getGreeting()}、{currentUser.name}さん
        </h2>
      </div>

      {/* Contribution widget */}
      <ContributionWidget
        data={contributionData}
        myPoints={myContribution?.totalPoints ?? 0}
        myRank={myRank || 1}
        currentUserId={CURRENT_USER_ID}
      />

      {/* Priority tasks */}
      <RecentTasksWidget tasks={priorityTasks} />

      {/* Expense widget */}
      <ExpenseWidget summary={expenseSummary} />

      {/* Notices widget */}
      <NoticesWidget notices={notices} />
    </div>
  );
}

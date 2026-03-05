export const dynamic = "force-dynamic";

import ContributionWidgetWrapper from "@/components/ContributionWidgetWrapper";
import ExpenseWidget from "@/components/ExpenseWidget";
import GreetingSection from "@/components/GreetingSection";
import NoticesWidget from "@/components/NoticesWidget";
import RecentTasksWidget from "@/components/RecentTasksWidget";
import { getPrioritizedTasks, getLatestCompletionByTask } from "@/domain/tasks";
import { calculateMonthlyExpenseSummary } from "@/domain/expenses/calculate-monthly-expense-summary";
import { readTaskCompletions } from "@/server/task-completions-store";
import { readTasks } from "@/server/task-store";
import { readExpenses } from "@/server/expense-store";
import { readBalanceAdjustments } from "@/server/balance-adjustment-store";
import { readContributionSettingsHistory } from "@/server/contribution-settings-store";
import { readNotices } from "@/server/notice-store";
import { listUsers } from "@/server/user-store";
import { getHouse } from "@/server/house-store";
import { resolveRequestHouseId } from "@/server/request-house";
import { toJstMonthKey } from "@/shared/lib/time";
import type { ContributionData, Member, TaskCompletionRecord } from "@/types";

const MS_PER_DAY = 1000 * 60 * 60 * 24;

function toLabelFromMonthKey(monthKey: string): string {
  const [year, month] = monthKey.split("-");
  return `${year}年${Number(month)}月`;
}

function toMonthKeyFromIsoDateTime(value: string | undefined): string | undefined {
  if (!value) return undefined;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return undefined;
  return toJstMonthKey(date);
}

function computeContributionData(
  records: TaskCompletionRecord[],
  users: Member[],
  now: Date,
): ContributionData[] {
  const thirtyDaysAgo = new Date(now.getTime() - 30 * MS_PER_DAY);
  const pointsByName: Record<string, number> = {};

  for (const record of records) {
    if (record.canceledAt) continue;
    const completedAt = new Date(record.completedAt);
    if (Number.isNaN(completedAt.getTime())) continue;
    if (completedAt < thirtyDaysAgo) continue;
    pointsByName[record.completedBy] = (pointsByName[record.completedBy] ?? 0) + record.points;
  }

  return users
    .map((member) => ({
      member,
      totalPoints: pointsByName[member.name] ?? 0,
    }))
    .sort((a, b) => b.totalPoints - a.totalPoints);
}

export default async function HomePage() {
  const now = new Date();
  const currentMonthKey = toJstMonthKey(now);
  const houseId = await resolveRequestHouseId();
  if (!houseId) {
    return (
      <div className="space-y-4">
        <GreetingSection />
        <ContributionWidgetWrapper data={[]} />
        <RecentTasksWidget tasks={[]} houseId={null} />
        <ExpenseWidget
          summary={{
            month: toLabelFromMonthKey(currentMonthKey),
            totalContributed: 0,
            totalSpent: 0,
            balance: 0,
          }}
        />
        <NoticesWidget notices={[]} />
      </div>
    );
  }

  const housePromise = getHouse(houseId);
  const usersPromise = housePromise.then((house) =>
    house?.memberUids.length ? listUsers(house.memberUids) : [],
  );

  const [
    house,
    completions,
    tasks,
    allExpenses,
    balanceAdjustments,
    contributionHistory,
    allNotices,
    users,
  ] = await Promise.all([
    housePromise,
    readTaskCompletions(houseId),
    readTasks(houseId),
    readExpenses(houseId),
    readBalanceAdjustments(houseId),
    readContributionSettingsHistory(houseId),
    readNotices(houseId),
    usersPromise,
  ]);
  const carryoverStartMonthKey = toMonthKeyFromIsoDateTime(house?.createdAt);

  const latestByTask = getLatestCompletionByTask(completions);
  const priorityTasks = getPrioritizedTasks(latestByTask, now, tasks.length, tasks);
  const priorityTaskCards = priorityTasks.map((task) => ({
    ...task,
    lastCompletedAtIso: task.lastCompletedAt ? task.lastCompletedAt.toISOString() : null,
  }));

  const contributionData = computeContributionData(completions, users, now);

  const summary = calculateMonthlyExpenseSummary(
    currentMonthKey,
    allExpenses,
    balanceAdjustments,
    contributionHistory,
    { carryoverStartMonthKey },
  );
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

  return (
    <div className="space-y-4">
      {/* Greeting */}
      <GreetingSection />

      {/* Contribution widget */}
      <ContributionWidgetWrapper data={contributionData} />

      {/* Priority tasks */}
      <RecentTasksWidget tasks={priorityTaskCards} houseId={houseId} />

      {/* Expense widget */}
      <ExpenseWidget summary={expenseSummary} />

      {/* Notices widget */}
      <NoticesWidget notices={notices} />
    </div>
  );
}

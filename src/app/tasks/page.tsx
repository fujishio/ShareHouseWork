export const dynamic = "force-dynamic";

import { getPrioritizedTasks, getLatestCompletionByTask } from "@/domain/tasks";
import MonthlyContributionCarousel from "@/components/MonthlyContributionCarousel";
import RecentCompletionsSection from "@/components/RecentCompletionsSection";
import UrgentTasksSection from "@/components/UrgentTasksSection";
import { readTaskCompletions } from "@/server/task-completions-store";
import { readTasks } from "@/server/task-store";
import { resolveRequestHouseId } from "@/server/request-house";

function toMonthKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

function getRecentMonthKeys(now: Date, length: number): string[] {
  return Array.from({ length }, (_, index) => {
    const date = new Date(now.getFullYear(), now.getMonth() - index, 1);
    return toMonthKey(date);
  });
}

export default async function TasksPage() {
  const now = new Date();
  const houseId = await resolveRequestHouseId();
  if (!houseId) {
    return (
      <div className="space-y-4">
        <section className="rounded-2xl border border-stone-200/60 bg-white p-4 shadow-sm">
          <h3 className="font-bold text-stone-800">急ぎのタスク</h3>
          <p className="mt-2 text-sm text-stone-500">ハウスに参加するとタスクが表示されます。</p>
        </section>
      </div>
    );
  }
  const [completions, tasks] = await Promise.all([readTaskCompletions(houseId), readTasks(houseId)]);
  const validCompletions = completions.filter((record) => !record.canceledAt);

  const latestByTask = getLatestCompletionByTask(completions);
  const priorityTasks = getPrioritizedTasks(latestByTask, now, tasks.length, tasks);
  const priorityTaskCards = priorityTasks.map((task) => ({
    ...task,
    lastCompletedAtIso: task.lastCompletedAt ? task.lastCompletedAt.toISOString() : null,
  }));

  const recentCompletions = [...completions]
    .filter((record) => !Number.isNaN(new Date(record.completedAt).getTime()))
    .sort(
      (a, b) =>
        new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime()
    )
    .slice(0, 12);

  const monthKeys = getRecentMonthKeys(now, 6);
  const monthRatios = monthKeys.map((monthKey) => {
    const monthlyRecords = validCompletions.filter((record) =>
      record.completedAt.startsWith(monthKey)
    );

    const pointsByMember = monthlyRecords.reduce<Record<string, number>>((acc, record) => {
      const member = record.completedBy;
      acc[member] = (acc[member] ?? 0) + record.points;
      return acc;
    }, {});

    const total = Object.values(pointsByMember).reduce((sum, value) => sum + value, 0);

    const members = Object.entries(pointsByMember)
      .map(([name, points]) => ({
        name,
        points,
        ratio: total === 0 ? 0 : Math.round((points / total) * 100),
      }))
      .sort((a, b) => b.points - a.points);

    return {
      monthKey,
      total,
      members,
    };
  });

  return (
    <div className="space-y-4">
      <section className="rounded-2xl border border-stone-200/60 bg-white p-4 shadow-sm">
        <UrgentTasksSection
          initialPriorityTasks={priorityTaskCards}
          nowIso={now.toISOString()}
          houseId={houseId}
        />
      </section>

      <MonthlyContributionCarousel months={monthRatios} />

      <RecentCompletionsSection initialRecords={recentCompletions} />
    </div>
  );
}

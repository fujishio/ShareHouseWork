import { AlertCircle, CheckCircle2, Clock, Star } from "lucide-react";
import { TASKS, getPrioritizedTasks } from "@/domain/tasks";
import MonthlyContributionCarousel from "@/components/MonthlyContributionCarousel";
import RecentCompletionsSection from "@/components/RecentCompletionsSection";
import { readTaskCompletions } from "@/server/task-completions-store";
import { formatRelativeTime } from "@/shared/lib/time";
import type { TaskCompletionRecord } from "@/types";

const MS_PER_DAY = 1000 * 60 * 60 * 24;

function getLatestCompletionByTask(records: TaskCompletionRecord[]): Record<number, Date | null> {
  const latestByTask: Record<number, Date | null> = {};

  for (const record of records) {
    if (record.canceledAt) {
      continue;
    }

    const completedAt = new Date(record.completedAt);
    if (Number.isNaN(completedAt.getTime())) {
      continue;
    }

    const current = latestByTask[record.taskId];
    if (!current || completedAt > current) {
      latestByTask[record.taskId] = completedAt;
    }
  }

  return latestByTask;
}

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

function StatusBadge({ overdueDays }: { overdueDays: number }) {
  if (overdueDays > 0) {
    return (
      <span className="inline-flex items-center gap-1 rounded-md bg-red-50 px-2 py-0.5 text-xs font-semibold text-red-600">
        <AlertCircle size={12} />
        {overdueDays}日超過
      </span>
    );
  }

  if (overdueDays === 0) {
    return (
      <span className="inline-flex items-center gap-1 rounded-md bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-600">
        <Clock size={12} />
        今日が期限
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 rounded-md bg-stone-100 px-2 py-0.5 text-xs font-semibold text-stone-500">
      <CheckCircle2 size={12} />
      あと{Math.abs(overdueDays)}日
    </span>
  );
}

export default async function TasksPage() {
  const now = new Date();
  const completions = await readTaskCompletions();
  const validCompletions = completions.filter((record) => !record.canceledAt);

  const latestByTask = getLatestCompletionByTask(completions);
  const priorityTasks = getPrioritizedTasks(latestByTask, now, 6);

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
        <h3 className="font-bold text-stone-800">急ぎのタスク</h3>
        <p className="mt-1 text-xs text-stone-500">優先度が高い順に表示しています。</p>
        <ul className="mt-3 space-y-2">
          {priorityTasks.map((task) => (
            <li
              key={task.id}
              className="rounded-xl border border-stone-200/60 bg-stone-50 px-3 py-2"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-stone-800">{task.name}</p>
                  <p className="mt-0.5 text-xs text-stone-500">
                    {task.category} ・ {task.frequencyDays}日ごと
                  </p>
                </div>
                <div className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-700">
                  <Star size={10} fill="currentColor" />+{task.points}
                </div>
              </div>
              <div className="mt-2 flex items-center justify-between gap-2">
                <StatusBadge overdueDays={task.overdueDays} />
                <p className="text-xs text-stone-400">
                  {task.lastCompletedAt
                    ? `最終: ${formatRelativeTime(task.lastCompletedAt, now)}`
                    : "最終: まだ記録なし"}
                </p>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <MonthlyContributionCarousel months={monthRatios} />

      <RecentCompletionsSection initialRecords={recentCompletions} />
    </div>
  );
}

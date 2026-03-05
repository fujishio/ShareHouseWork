"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { AlertCircle, Clock, CheckCircle2 } from "lucide-react";
import type { PrioritizedTask } from "@/types";

type TaskCard = Omit<PrioritizedTask, "lastCompletedAt"> & {
  lastCompletedAtIso: string | null;
};

type Props = {
  tasks: TaskCard[];
  houseId: string | null;
};

function UrgencyBadge({ task }: { task: TaskCard }) {
  if (task.overdueDays > 0) {
    return (
      <span className="text-xs font-semibold text-red-600 bg-red-50 px-1.5 py-0.5 rounded-md whitespace-nowrap">
        {task.overdueDays}日超過
      </span>
    );
  }
  if (task.overdueDays === 0) {
    return (
      <span className="text-xs font-semibold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded-md whitespace-nowrap">
        今日が期限
      </span>
    );
  }
  return (
    <span className="text-xs font-semibold text-stone-400 bg-stone-100 px-1.5 py-0.5 rounded-md whitespace-nowrap">
      あと{Math.abs(task.overdueDays)}日
    </span>
  );
}

function UrgencyIcon({ task }: { task: TaskCard }) {
  if (task.overdueDays > 0) {
    return (
      <div className="w-8 h-8 rounded-full bg-red-50 flex items-center justify-center flex-shrink-0">
        <AlertCircle size={16} className="text-red-400" />
      </div>
    );
  }
  if (task.overdueDays === 0) {
    return (
      <div className="w-8 h-8 rounded-full bg-amber-50 flex items-center justify-center flex-shrink-0">
        <Clock size={16} className="text-amber-500" />
      </div>
    );
  }
  return (
    <div className="w-8 h-8 rounded-full bg-stone-100 flex items-center justify-center flex-shrink-0">
      <CheckCircle2 size={16} className="text-stone-400" />
    </div>
  );
}

export default function RecentTasksWidget({ tasks, houseId }: Props) {
  const storageKey = useMemo(() => (houseId ? `tasks:pending:${houseId}` : null), [houseId]);
  const [pendingIds, setPendingIds] = useState<string[]>([]);

  useEffect(() => {
    if (!storageKey) {
      setPendingIds([]);
      return;
    }
    try {
      const raw = window.localStorage.getItem(storageKey);
      if (!raw) {
        setPendingIds([]);
        return;
      }
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) {
        setPendingIds([]);
        return;
      }
      setPendingIds(parsed.filter((value): value is string => typeof value === "string"));
    } catch {
      setPendingIds([]);
    }
  }, [storageKey]);

  const visibleTasks = useMemo(() => {
    if (!pendingIds.length) return tasks;
    const pendingSet = new Set(pendingIds);
    return tasks.filter((task) => !pendingSet.has(task.id));
  }, [pendingIds, tasks]);

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-stone-200/60 p-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-bold text-stone-800">急ぎのタスク</h2>
        <Link
          href="/tasks"
          className="text-xs text-amber-600 hover:underline font-medium"
        >
          すべて見る →
        </Link>
      </div>

      {visibleTasks.length === 0 ? (
        <p className="text-sm text-stone-400 py-2 text-center">タスクがありません</p>
      ) : (
        <ul className="space-y-1">
          {visibleTasks.map((task) => {
            const lastCompletedAt = task.lastCompletedAtIso ? new Date(task.lastCompletedAtIso) : null;
            return (
              <li
                key={task.id}
                className="flex items-center gap-3 py-2.5 border-b border-stone-100/60 last:border-0"
              >
                <UrgencyIcon task={task} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-stone-700 leading-snug truncate">
                    {task.name}
                  </p>
                  <p className="text-xs text-stone-400 mt-0.5">
                    {lastCompletedAt
                      ? `最終: ${Math.round((Date.now() - lastCompletedAt.getTime()) / 86400000)}日前`
                      : "まだ完了記録なし"}
                    &nbsp;·&nbsp;{task.frequencyDays}日ごと
                  </p>
                </div>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <UrgencyBadge task={task} />
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

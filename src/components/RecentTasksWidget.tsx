"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { AlertCircle, Clock, CheckCircle2 } from "lucide-react";
import type { PrioritizedTask } from "@/types";
import { apiFetch } from "@/shared/lib/fetch-client";

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
    if (!houseId || !storageKey) {
      setPendingIds([]);
      return;
    }
    let mounted = true;

    const readPendingIdsFromLocal = () => {
      try {
        const raw = window.localStorage.getItem(storageKey);
        if (!raw) return [];
        const parsed = JSON.parse(raw);
        if (!Array.isArray(parsed)) return [];
        return parsed.filter((value): value is string => typeof value === "string");
      } catch {
        return [];
      }
    };

    const savePendingIdsToLocal = (ids: string[]) => {
      try {
        window.localStorage.setItem(storageKey, JSON.stringify(ids));
      } catch {
        // noop
      }
    };

    async function loadPending() {
      try {
        const response = await apiFetch("/api/task-pending");
        if (!response.ok) {
          if (mounted) {
            setPendingIds([]);
          }
          return;
        }
        const payload = (await response.json()) as {
          data?: { pendingTaskIds?: unknown };
        };
        const rawIds = payload.data?.pendingTaskIds;
        if (!Array.isArray(rawIds)) {
          if (mounted) {
            setPendingIds([]);
          }
          return;
        }
        const validIds = rawIds.filter((value): value is string => typeof value === "string");
        if (validIds.length === 0) {
          const localIds = readPendingIdsFromLocal();
          if (localIds.length > 0) {
            if (mounted) {
              setPendingIds(localIds);
            }
            await apiFetch("/api/task-pending", {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ pendingTaskIds: localIds }),
            }).catch(() => undefined);
            return;
          }
        }
        if (mounted) {
          setPendingIds(validIds);
          savePendingIdsToLocal(validIds);
        }
      } catch {
        if (mounted) {
          setPendingIds(readPendingIdsFromLocal());
        }
      }
    }

    void loadPending();
    return () => {
      mounted = false;
    };
  }, [houseId, storageKey]);

  const visibleTasks = useMemo(() => {
    if (!pendingIds.length) return tasks;
    const pendingSet = new Set(pendingIds);
    return tasks.filter((task) => !pendingSet.has(task.id));
  }, [pendingIds, tasks]);
  const topVisibleTasks = useMemo(() => visibleTasks.slice(0, 5), [visibleTasks]);

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

      {topVisibleTasks.length === 0 ? (
        <p className="text-sm text-stone-400 py-2 text-center">タスクがありません</p>
      ) : (
        <ul className="space-y-1">
          {topVisibleTasks.map((task) => {
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

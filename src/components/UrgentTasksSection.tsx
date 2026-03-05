"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, CheckCircle2, Clock, Star } from "lucide-react";
import type { PrioritizedTask } from "@/types/tasks";
import { formatRelativeTime } from "@/shared/lib/time";
import { apiFetch } from "@/shared/lib/fetch-client";
import { submitApiAction } from "@/shared/lib/submit-api-action";
import { showToast } from "@/shared/lib/toast";

type PriorityTaskCard = Omit<PrioritizedTask, "lastCompletedAt"> & {
  lastCompletedAtIso: string | null;
};

type Props = {
  initialPriorityTasks: PriorityTaskCard[];
  nowIso: string;
  houseId: string;
};

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

function TaskSummary({
  task,
  now,
  onOpenAction,
}: {
  task: PriorityTaskCard;
  now: Date;
  onOpenAction: (taskId: string) => void;
}) {
  const completedAt = task.lastCompletedAtIso ? new Date(task.lastCompletedAtIso) : null;

  return (
    <button
      type="button"
      className="w-full rounded-xl border border-stone-200/60 bg-stone-50 px-3 py-2 text-left hover:bg-stone-100"
      onClick={() => {
        onOpenAction(task.id);
      }}
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
          {completedAt ? `最終: ${formatRelativeTime(completedAt, now)}` : "最終: まだ記録なし"}
        </p>
      </div>
    </button>
  );
}

export default function UrgentTasksSection({ initialPriorityTasks, nowIso, houseId }: Props) {
  const router = useRouter();
  const now = useMemo(() => new Date(nowIso), [nowIso]);
  const storageKey = useMemo(() => `tasks:pending:${houseId}`, [houseId]);
  const [pendingIds, setPendingIds] = useState<string[]>([]);
  const [isPendingLoaded, setIsPendingLoaded] = useState(false);
  const [actionTargetId, setActionTargetId] = useState<string | null>(null);
  const [completingTaskId, setCompletingTaskId] = useState<string | null>(null);
  const [updatingPendingId, setUpdatingPendingId] = useState<string | null>(null);
  const [isPendingOpen, setIsPendingOpen] = useState(false);

  const readPendingIdsFromLocal = useCallback(() => {
    try {
      const raw = window.localStorage.getItem(storageKey);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [];
      return parsed.filter((value): value is string => typeof value === "string");
    } catch {
      return [];
    }
  }, [storageKey]);

  const savePendingIdsToLocal = useCallback((ids: string[]) => {
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(ids));
    } catch {
      // noop
    }
  }, [storageKey]);

  useEffect(() => {
    let mounted = true;

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
          const localIds = readPendingIdsFromLocal();
          setPendingIds(localIds);
        }
      } finally {
        if (mounted) {
          setIsPendingLoaded(true);
        }
      }
    }

    void loadPending();
    return () => {
      mounted = false;
    };
  }, [houseId, readPendingIdsFromLocal, savePendingIdsToLocal]);

  const pendingSet = useMemo(() => new Set(pendingIds), [pendingIds]);
  const urgentTasks = useMemo(
    () => initialPriorityTasks.filter((task) => !pendingSet.has(task.id)),
    [initialPriorityTasks, pendingSet]
  );
  const pendingTasks = useMemo(
    () => initialPriorityTasks.filter((task) => pendingSet.has(task.id)),
    [initialPriorityTasks, pendingSet]
  );

  const syncPendingIds = async (nextIds: string[], taskId: string) => {
    setUpdatingPendingId(taskId);
    try {
      const response = await apiFetch("/api/task-pending", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pendingTaskIds: nextIds }),
      });
      if (!response.ok) {
        showToast({ level: "error", message: "保留タスクの更新に失敗しました" });
        router.refresh();
      } else {
        savePendingIdsToLocal(nextIds);
      }
    } catch {
      showToast({ level: "error", message: "保留タスクの更新に失敗しました" });
      router.refresh();
    } finally {
      setUpdatingPendingId(null);
    }
  };

  const holdTask = (taskId: string) => {
    setPendingIds((prev) => {
      const nextIds = prev.includes(taskId) ? prev : [...prev, taskId];
      void syncPendingIds(nextIds, taskId);
      return nextIds;
    });
    setActionTargetId(null);
  };

  const resumeTask = (taskId: string) => {
    setPendingIds((prev) => {
      const nextIds = prev.filter((id) => id !== taskId);
      void syncPendingIds(nextIds, taskId);
      return nextIds;
    });
  };

  const completeTask = async (taskId: string) => {
    if (completingTaskId) return;
    setCompletingTaskId(taskId);
    const succeeded = await submitApiAction({
      request: () =>
        apiFetch("/api/task-completions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            taskId,
            completedAt: new Date().toISOString(),
            source: "app",
          }),
        }),
      successMessage: "完了報告を保存しました",
      fallbackErrorMessage: "完了報告の保存に失敗しました",
    });
    setCompletingTaskId(null);
    setActionTargetId(null);
    if (succeeded) {
      router.refresh();
    }
  };

  return (
    <>
      <h3 className="font-bold text-stone-800">急ぎのタスク</h3>
      <p className="mt-1 text-xs text-stone-500">優先度が高い順に表示しています。</p>
      <p className="mt-1 text-xs text-amber-700">
        タスクをクリックすると「完了する」か「保留する」か選べます。
      </p>

      <ul className="mt-3 max-h-[40vh] space-y-2 overflow-y-auto pr-1">
        {urgentTasks.map((task) => {
          const isActionOpen = actionTargetId === task.id;
          const isCompleting = completingTaskId === task.id;
          return (
            <li key={task.id} className="rounded-xl">
              <TaskSummary task={task} now={now} onOpenAction={setActionTargetId} />
              {isActionOpen && (
                <div className="mt-2 flex gap-2 px-1">
                  <button
                    type="button"
                    onClick={() => {
                      void completeTask(task.id);
                    }}
                    disabled={Boolean(completingTaskId) || Boolean(updatingPendingId)}
                    className="rounded-md bg-emerald-600 px-2 py-1 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
                  >
                    {isCompleting ? "完了中..." : "完了する"}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      holdTask(task.id);
                    }}
                    disabled={Boolean(completingTaskId) || Boolean(updatingPendingId)}
                    className="rounded-md border border-stone-300 px-2 py-1 text-xs font-semibold text-stone-600 hover:bg-stone-100 disabled:opacity-60"
                  >
                    保留する
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setActionTargetId(null);
                    }}
                    disabled={Boolean(completingTaskId) || Boolean(updatingPendingId)}
                    className="rounded-md border border-stone-300 px-2 py-1 text-xs font-semibold text-stone-500 hover:bg-stone-100 disabled:opacity-60"
                  >
                    閉じる
                  </button>
                </div>
              )}
            </li>
          );
        })}
        {urgentTasks.length === 0 && (
          <li className="rounded-xl border border-dashed border-stone-300 bg-stone-50 px-3 py-3 text-xs text-stone-500">
            急ぎのタスクはありません。
          </li>
        )}
      </ul>

      <div className="mt-4">
        <button
          type="button"
          onClick={() => {
            setIsPendingOpen((prev) => !prev);
          }}
          className="flex w-full items-center justify-between rounded-md px-1 py-1 text-left hover:bg-stone-100"
          aria-expanded={isPendingOpen}
        >
          <h4 className="text-sm font-semibold text-stone-700">保留中のタスク</h4>
          <span className="text-xs font-semibold text-stone-500">
            {isPendingLoaded ? `${pendingTasks.length}件` : "読込中..."} {isPendingOpen ? "▲" : "▼"}
          </span>
        </button>
        {isPendingOpen && (
          <ul className="mt-2 space-y-2">
            {pendingTasks.map((task) => (
              <li
                key={task.id}
                className="flex items-center justify-between gap-2 rounded-xl border border-stone-200/70 bg-white px-3 py-2"
              >
                <p className="min-w-0 truncate text-sm text-stone-700">{task.name}</p>
                <button
                  type="button"
                  onClick={() => {
                    resumeTask(task.id);
                  }}
                  className="shrink-0 rounded-md border border-stone-300 px-2 py-1 text-xs font-semibold text-stone-600 hover:bg-stone-100"
                >
                  急ぎに戻す
                </button>
              </li>
            ))}
            {pendingTasks.length === 0 && (
              <li className="rounded-xl border border-dashed border-stone-300 bg-stone-50 px-3 py-3 text-xs text-stone-500">
                保留中のタスクはありません。
              </li>
            )}
          </ul>
        )}
      </div>
    </>
  );
}

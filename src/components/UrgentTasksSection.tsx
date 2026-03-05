"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, CheckCircle2, Clock, Star } from "lucide-react";
import type { PrioritizedTask } from "@/types/tasks";
import { formatRelativeTime } from "@/shared/lib/time";
import { apiFetch } from "@/shared/lib/fetch-client";
import { submitApiAction } from "@/shared/lib/submit-api-action";

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
  const [isStorageLoaded, setIsStorageLoaded] = useState(false);
  const [actionTargetId, setActionTargetId] = useState<string | null>(null);
  const [completingTaskId, setCompletingTaskId] = useState<string | null>(null);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(storageKey);
      if (!raw) {
        setPendingIds([]);
        setIsStorageLoaded(true);
        return;
      }
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) {
        setPendingIds([]);
        setIsStorageLoaded(true);
        return;
      }
      const validIds = parsed.filter((value): value is string => typeof value === "string");
      setPendingIds(validIds);
      setIsStorageLoaded(true);
    } catch {
      setPendingIds([]);
      setIsStorageLoaded(true);
    }
  }, [storageKey]);

  useEffect(() => {
    if (!isStorageLoaded) return;
    window.localStorage.setItem(storageKey, JSON.stringify(pendingIds));
  }, [isStorageLoaded, pendingIds, storageKey]);

  const pendingSet = useMemo(() => new Set(pendingIds), [pendingIds]);
  const urgentTasks = useMemo(
    () => initialPriorityTasks.filter((task) => !pendingSet.has(task.id)),
    [initialPriorityTasks, pendingSet]
  );
  const pendingTasks = useMemo(
    () => initialPriorityTasks.filter((task) => pendingSet.has(task.id)),
    [initialPriorityTasks, pendingSet]
  );

  const holdTask = (taskId: string) => {
    setPendingIds((prev) => (prev.includes(taskId) ? prev : [...prev, taskId]));
    setActionTargetId(null);
  };

  const resumeTask = (taskId: string) => {
    setPendingIds((prev) => prev.filter((id) => id !== taskId));
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
                    disabled={Boolean(completingTaskId)}
                    className="rounded-md bg-emerald-600 px-2 py-1 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
                  >
                    {isCompleting ? "完了中..." : "完了する"}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      holdTask(task.id);
                    }}
                    disabled={Boolean(completingTaskId)}
                    className="rounded-md border border-stone-300 px-2 py-1 text-xs font-semibold text-stone-600 hover:bg-stone-100 disabled:opacity-60"
                  >
                    保留する
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setActionTargetId(null);
                    }}
                    disabled={Boolean(completingTaskId)}
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
        <h4 className="text-sm font-semibold text-stone-700">保留中のタスク</h4>
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
      </div>
    </>
  );
}

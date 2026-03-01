"use client";

import { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Check, Star, ChevronLeft } from "lucide-react";
import type {
  ApiErrorResponse,
  CreateTaskCompletionInput,
  Task,
  TaskCompletionCreateResponse,
  TaskListResponse,
} from "@/types";
import { LoadingNotice } from "@/components/RequestStatus";
import { showToast } from "@/shared/lib/toast";

type Props = {
  onClose: () => void;
};

export default function TaskCompleteModal({ onClose }: Props) {
  const router = useRouter();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [tasksLoading, setTasksLoading] = useState(true);
  const [tasksError, setTasksError] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [completedTaskId, setCompletedTaskId] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  useEffect(() => {
    fetch("/api/tasks")
      .then((res) => res.json() as Promise<TaskListResponse | ApiErrorResponse>)
      .then((json) => {
        if ("data" in json) {
          setTasks(json.data);
        } else {
          setTasksError(true);
        }
      })
      .catch(() => setTasksError(true))
      .finally(() => setTasksLoading(false));
  }, []);

  const categories = useMemo(() => {
    const map = new Map<string, number>();
    for (const task of tasks) {
      map.set(task.category, (map.get(task.category) ?? 0) + 1);
    }
    return Array.from(map.entries()).map(([name, count]) => ({ name, count }));
  }, [tasks]);

  const filteredTasks = useMemo(
    () => tasks.filter((t) => t.category === selectedCategory),
    [tasks, selectedCategory]
  );

  const handleComplete = async (taskId: number) => {
    if (isSubmitting) return;

    setCompletedTaskId(taskId);
    setIsSubmitting(true);
    setFeedback(null);

    try {
      const response = await fetch("/api/task-completions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          taskId,
          completedBy: "あなた",
          completedAt: new Date().toISOString(),
          source: "app",
        } satisfies CreateTaskCompletionInput),
      });

      const result = (await response.json().catch(() => null)) as
        | TaskCompletionCreateResponse
        | ApiErrorResponse
        | null;

      if (!response.ok) {
        throw new Error(
          result && "error" in result ? result.error : "完了報告の保存に失敗しました"
        );
      }

      router.refresh();
      setFeedback({ type: "success", message: "完了報告を保存しました" });
      showToast({ level: "success", message: "完了報告を保存しました" });
      setTimeout(() => {
        onClose();
      }, 1000);
    } catch (error) {
      setCompletedTaskId(null);
      setFeedback({
        type: "error",
        message: error instanceof Error ? error.message : "通信エラーが発生しました",
      });
      showToast({
        level: "error",
        message: error instanceof Error ? error.message : "通信エラーが発生しました",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-3 pb-2 border-b border-stone-100 shrink-0">
        <div className="flex items-center gap-1">
          {selectedCategory && (
            <button
              onClick={() => setSelectedCategory(null)}
              className="w-6 h-6 rounded-full hover:bg-stone-100 flex items-center justify-center transition-colors"
              aria-label="戻る"
            >
              <ChevronLeft size={16} className="text-stone-500" />
            </button>
          )}
          <h2 className="text-sm font-bold text-stone-800">
            {selectedCategory ?? "ジャンル選択"}
          </h2>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-3 py-2">
        {(isSubmitting || tasksLoading) && (
          <div className="mb-2">
            <LoadingNotice message={tasksLoading ? "タスクを読み込み中..." : "完了報告を保存中..."} />
          </div>
        )}
        {tasksError && (
          <div className="mb-2 rounded-lg px-3 py-2 text-xs font-medium bg-red-50 text-red-700">
            タスクの読み込みに失敗しました。再度お試しください。
          </div>
        )}
        {feedback && (
          <div
            className={`mb-2 rounded-lg px-3 py-2 text-xs font-medium ${
              feedback.type === "success"
                ? "bg-emerald-50 text-emerald-700"
                : "bg-red-50 text-red-700"
            }`}
            aria-live="polite"
          >
            {feedback.message}
          </div>
        )}
        {!selectedCategory ? (
          <div className="space-y-1.5">
            {categories.map((cat) => (
              <button
                key={cat.name}
                onClick={() => setSelectedCategory(cat.name)}
                className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl bg-stone-50 border border-stone-200/60 hover:bg-stone-100 active:bg-stone-200 transition-colors"
              >
                <span className="text-sm font-medium text-stone-700">
                  {cat.name}
                </span>
                <span className="text-xs text-stone-400">{cat.count}件</span>
              </button>
            ))}
          </div>
        ) : (
          <div className="space-y-1.5">
            {filteredTasks.map((task) => {
              const isCompleted = completedTaskId === task.id;
              return (
                <button
                  key={task.id}
                  onClick={() => !completedTaskId && handleComplete(task.id)}
                  disabled={!!completedTaskId || isSubmitting}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl border transition-all ${
                    isCompleted
                      ? "bg-amber-50 border-amber-300"
                      : "bg-stone-50 border-stone-200/60 hover:bg-stone-100 active:bg-stone-200"
                  } ${isSubmitting && !isCompleted ? "opacity-40" : ""}`}
                >
                  <div className="flex items-center gap-2">
                    <div
                      className={`w-6 h-6 rounded-full flex items-center justify-center transition-all ${
                        isCompleted
                          ? "bg-amber-500 text-white scale-110"
                          : "bg-stone-200 text-stone-400"
                      }`}
                    >
                      <Check size={12} strokeWidth={2.5} />
                    </div>
                    <span
                      className={`text-xs font-medium ${
                        isCompleted ? "text-amber-700" : "text-stone-700"
                      }`}
                    >
                      {isCompleted && isSubmitting ? "保存中..." : task.name}
                    </span>
                  </div>
                  <span
                    className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full flex items-center gap-0.5 shrink-0 ${
                      isCompleted
                        ? "bg-amber-200 text-amber-800"
                        : "bg-amber-100 text-amber-700"
                    }`}
                  >
                    <Star size={8} fill="currentColor" />+{task.points}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}

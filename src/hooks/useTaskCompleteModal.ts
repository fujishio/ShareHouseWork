import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { ApiErrorResponse, Task, TaskListResponse, TaskCompletionRecord } from "@/types";
import { apiFetch, readJson } from "@/shared/lib/fetch-client";
import { isDataObjectResponse } from "@/shared/lib/response-guards";
import { submitApiAction } from "@/shared/lib/submit-api-action";

type Feedback = {
  type: "success" | "error";
  message: string;
};

export function useTaskCompleteModal(onClose: () => void) {
  const router = useRouter();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [tasksLoading, setTasksLoading] = useState(true);
  const [tasksError, setTasksError] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [completedTaskId, setCompletedTaskId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<Feedback | null>(null);

  useEffect(() => {
    apiFetch("/api/tasks")
      .then((response) => readJson<TaskListResponse | ApiErrorResponse>(response))
      .then((json) => {
        if ("data" in json) {
          setTasks(json.data);
          return;
        }
        setTasksError(true);
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
    () => tasks.filter((task) => task.category === selectedCategory),
    [tasks, selectedCategory]
  );

  const completeTask = useCallback(async (taskId: string) => {
    if (isSubmitting) return;

    setCompletedTaskId(taskId);
    setIsSubmitting(true);
    setFeedback(null);

    try {
      await submitApiAction({
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
        onError: (message) => {
          setCompletedTaskId(null);
          setFeedback({ type: "error", message });
        },
        onSuccess: async (response) => {
          await readJson<{ data: TaskCompletionRecord }>(
            response,
            isDataObjectResponse<TaskCompletionRecord>
          );
          router.refresh();
          setFeedback({ type: "success", message: "完了報告を保存しました" });
          setTimeout(() => {
            onClose();
          }, 1000);
        },
      });
    } finally {
      setIsSubmitting(false);
    }
  }, [isSubmitting, onClose, router]);

  return {
    tasksLoading,
    tasksError,
    selectedCategory,
    completedTaskId,
    isSubmitting,
    feedback,
    categories,
    filteredTasks,
    setSelectedCategory,
    completeTask,
  };
}

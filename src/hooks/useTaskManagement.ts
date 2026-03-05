import { useCallback, useEffect, useMemo, useState } from "react";
import { TASK_CATEGORIES } from "@/shared/constants/task";
import { apiFetch, readJson } from "@/shared/lib/fetch-client";
import { submitApiAction } from "@/shared/lib/submit-api-action";
import { isDataArrayResponse } from "@/shared/lib/response-guards";
import { showToast } from "@/shared/lib/toast";
import type { Task, TaskCategory, TaskListResponse } from "@/types";

export type TaskFormState = {
  name: string;
  category: TaskCategory;
  points: string;
  frequencyDays: string;
};

export const BLANK_TASK_FORM: TaskFormState = {
  name: "",
  category: TASK_CATEGORIES[0],
  points: "10",
  frequencyDays: "7",
};

const TASK_CATEGORY_ORDER = new Map(TASK_CATEGORIES.map((category, index) => [category, index]));

function compareTaskOrder(a: Task, b: Task): number {
  const categoryDiff =
    (TASK_CATEGORY_ORDER.get(a.category) ?? 999) - (TASK_CATEGORY_ORDER.get(b.category) ?? 999);
  if (categoryDiff !== 0) {
    return categoryDiff;
  }

  const orderDiff = (a.displayOrder ?? Number.MAX_SAFE_INTEGER) - (b.displayOrder ?? Number.MAX_SAFE_INTEGER);
  if (orderDiff !== 0) {
    return orderDiff;
  }

  return a.name.localeCompare(b.name, "ja");
}

function sortTasks(items: Task[]): Task[] {
  return [...items].sort(compareTaskOrder);
}

function parseTaskForm(form: TaskFormState): {
  name: string;
  category: TaskCategory;
  points: number;
  frequencyDays: number;
  displayOrder?: number;
} | null {
  const name = form.name.trim();
  const points = Number(form.points);
  const frequencyDays = Number(form.frequencyDays);
  if (!name) return null;
  if (!Number.isInteger(points) || points < 1) return null;
  if (!Number.isInteger(frequencyDays) || frequencyDays < 1) return null;
  return { name, category: form.category, points, frequencyDays };
}

export function useTaskManagement() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TaskCategory>(TASK_CATEGORIES[0]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<TaskFormState>(BLANK_TASK_FORM);
  const [addingNew, setAddingNew] = useState(false);
  const [newForm, setNewForm] = useState<TaskFormState>({ ...BLANK_TASK_FORM, category: TASK_CATEGORIES[0] });
  const [saving, setSaving] = useState(false);

  const loadTasks = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const response = await apiFetch("/api/tasks");
      if (!response.ok) {
        setLoadError("タスクの取得に失敗しました");
        return;
      }
      const json = await readJson<TaskListResponse>(response, isDataArrayResponse<Task>);
      setTasks(sortTasks(json.data));
    } catch {
      setLoadError("通信エラーが発生しました");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadTasks();
  }, [loadTasks]);

  const tasksByCategory = useMemo(() => {
    const map = new Map<TaskCategory, Task[]>();
    for (const category of TASK_CATEGORIES) {
      map.set(category, []);
    }
    for (const task of tasks) {
      const list = map.get(task.category);
      if (list) {
        list.push(task);
      }
    }
    for (const category of TASK_CATEGORIES) {
      const list = map.get(category);
      if (list) {
        list.sort(compareTaskOrder);
      }
    }
    return map;
  }, [tasks]);

  const switchTab = useCallback((category: TaskCategory) => {
    setActiveTab(category);
    setEditingId(null);
    setAddingNew(false);
    setNewForm({ ...BLANK_TASK_FORM, category });
  }, []);

  const startEdit = useCallback((task: Task) => {
    setEditingId(task.id);
    setEditForm({
      name: task.name,
      category: task.category,
      points: String(task.points),
      frequencyDays: String(task.frequencyDays),
    });
    setAddingNew(false);
  }, []);

  const cancelEdit = useCallback(() => {
    setEditingId(null);
  }, []);

  const startAdd = useCallback(() => {
    setAddingNew(true);
    setEditingId(null);
    setNewForm({ ...BLANK_TASK_FORM, category: activeTab });
  }, [activeTab]);

  const cancelAdd = useCallback(() => {
    setAddingNew(false);
    setNewForm({ ...BLANK_TASK_FORM, category: activeTab });
  }, [activeTab]);

  const saveEdit = useCallback(async () => {
    if (!editingId) return;

    const currentTask = tasks.find((task) => task.id === editingId);
    const parsed = parseTaskForm(editForm);
    const payload = parsed ? { ...parsed, displayOrder: currentTask?.displayOrder } : null;
    if (!payload) return;

    setSaving(true);
    try {
      await submitApiAction({
        request: () =>
          apiFetch(`/api/tasks/${editingId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          }),
        successMessage: "タスクを更新しました",
        fallbackErrorMessage: "タスクの更新に失敗しました",
        onSuccess: async () => {
          setEditingId(null);
          await loadTasks();
        },
      });
    } finally {
      setSaving(false);
    }
  }, [editingId, editForm, loadTasks, tasks]);

  const saveNew = useCallback(async () => {
    const parsed = parseTaskForm(newForm);
    if (!parsed) return;

    const categoryTasks = tasksByCategory.get(activeTab) ?? [];
    const maxOrder = categoryTasks.reduce((max, task) => {
      if (typeof task.displayOrder !== "number") return max;
      return task.displayOrder > max ? task.displayOrder : max;
    }, -1);
    const payload = {
      ...parsed,
      displayOrder: maxOrder + 1,
    };

    setSaving(true);
    try {
      await submitApiAction({
        request: () =>
          apiFetch("/api/tasks", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          }),
        successMessage: "タスクを追加しました",
        fallbackErrorMessage: "タスクの追加に失敗しました",
        onSuccess: async () => {
          setAddingNew(false);
          setNewForm({ ...BLANK_TASK_FORM, category: activeTab });
          await loadTasks();
        },
      });
    } finally {
      setSaving(false);
    }
  }, [activeTab, loadTasks, newForm, tasksByCategory]);

  const deleteTask = useCallback(async (taskId: string, taskName: string) => {
    if (!window.confirm(`「${taskName}」を削除しますか？`)) return;

    setSaving(true);
    try {
      await submitApiAction({
        request: () => apiFetch(`/api/tasks/${taskId}`, { method: "DELETE" }),
        successMessage: "タスクを削除しました",
        fallbackErrorMessage: "タスクの削除に失敗しました",
        onSuccess: loadTasks,
      });
    } finally {
      setSaving(false);
    }
  }, [loadTasks]);

  const reorderTask = useCallback(
    async (draggedTaskId: string, targetTaskId: string) => {
      if (saving) return;
      if (draggedTaskId === targetTaskId) return;

      const categoryTasks = tasksByCategory.get(activeTab) ?? [];
      const fromIndex = categoryTasks.findIndex((task) => task.id === draggedTaskId);
      const toIndex = categoryTasks.findIndex((task) => task.id === targetTaskId);
      if (fromIndex < 0 || toIndex < 0 || fromIndex === toIndex) return;

      const reordered = [...categoryTasks];
      const [moved] = reordered.splice(fromIndex, 1);
      if (!moved) return;
      reordered.splice(toIndex, 0, moved);

      const updates = reordered
        .map((task, index) => ({ task, displayOrder: index }))
        .filter(({ task, displayOrder }) => task.displayOrder !== displayOrder);
      if (updates.length === 0) return;

      const nextById = new Map(
        reordered.map((task, index) => [task.id, { ...task, displayOrder: index }])
      );
      setTasks((prev) =>
        sortTasks(prev.map((task) => nextById.get(task.id) ?? task))
      );

      setSaving(true);
      try {
        await Promise.all(
          updates.map(async ({ task, displayOrder }) => {
            const response = await apiFetch(`/api/tasks/${task.id}`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                name: task.name,
                category: task.category,
                points: task.points,
                frequencyDays: task.frequencyDays,
                displayOrder,
              }),
            });
            if (!response.ok) {
              throw new Error("reorder failed");
            }
          })
        );
        showToast({ level: "success", message: "タスクの順番を保存しました" });
      } catch {
        showToast({ level: "error", message: "タスクの順番保存に失敗しました" });
        await loadTasks();
      } finally {
        setSaving(false);
      }
    },
    [activeTab, loadTasks, saving, tasksByCategory]
  );

  return {
    loading,
    loadError,
    saving,
    activeTab,
    editingId,
    editForm,
    addingNew,
    newForm,
    tasksByCategory,
    activeTasks: tasksByCategory.get(activeTab) ?? [],
    loadTasks,
    switchTab,
    startEdit,
    cancelEdit,
    setEditForm,
    startAdd,
    cancelAdd,
    setNewForm,
    saveEdit,
    saveNew,
    deleteTask,
    reorderTask,
  };
}

import { useCallback, useEffect, useMemo, useState } from "react";
import { TASK_CATEGORIES } from "@/shared/constants/task";
import { apiFetch, readJson } from "@/shared/lib/fetch-client";
import { submitApiAction } from "@/shared/lib/submit-api-action";
import { isDataArrayResponse } from "@/shared/lib/response-guards";
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

function parseTaskForm(form: TaskFormState): {
  name: string;
  category: TaskCategory;
  points: number;
  frequencyDays: number;
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
      setTasks(json.data);
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

    const payload = parseTaskForm(editForm);
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
  }, [editingId, editForm, loadTasks]);

  const saveNew = useCallback(async () => {
    const payload = parseTaskForm(newForm);
    if (!payload) return;

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
  }, [activeTab, loadTasks, newForm]);

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
  };
}

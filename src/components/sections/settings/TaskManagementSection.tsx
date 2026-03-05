import { useState } from "react";
import { ClipboardList, GripVertical, Pencil, Plus, Trash2 } from "lucide-react";
import { TASK_CATEGORIES } from "@/shared/constants/task";
import { RetryNotice, LoadingNotice } from "@/components/RequestStatus";
import { useTaskManagement } from "@/hooks/useTaskManagement";
import { TaskInlineForm } from "./TaskInlineForm";

export function TaskManagementSection() {
  const {
    loading,
    loadError,
    saving,
    activeTab,
    activeTasks,
    tasksByCategory,
    editingId,
    editForm,
    addingNew,
    newForm,
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
  } = useTaskManagement();
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const [touchDraggingId, setTouchDraggingId] = useState<string | null>(null);

  return (
    <div className="rounded-2xl border border-stone-200/60 bg-white p-4">
      <div className="mb-1 flex items-center gap-2">
        <ClipboardList size={18} className="text-amber-500" />
        <h3 className="text-sm font-bold text-stone-800">タスク管理</h3>
      </div>
      <p className="mb-3 text-xs text-stone-500">タスクの追加・編集・削除・並び替えができます。</p>

      {loading && <LoadingNotice message="タスクを読み込み中..." />}
      {loadError && (
        <RetryNotice
          message={loadError}
          actionLabel="再取得"
          onRetry={() => {
            void loadTasks();
          }}
          disabled={loading}
        />
      )}

      {!loading && !loadError && (
        <>
          <div className="scrollbar-none mb-3 flex gap-1 overflow-x-auto pb-1">
            {TASK_CATEGORIES.map((category) => {
              const count = tasksByCategory.get(category)?.length ?? 0;
              const isActive = category === activeTab;
              return (
                <button
                  key={category}
                  type="button"
                  onClick={() => switchTab(category)}
                  className={`shrink-0 whitespace-nowrap rounded-full px-3 py-1 text-[11px] font-semibold transition-colors ${
                    isActive ? "bg-amber-500 text-white" : "bg-stone-100 text-stone-500 hover:bg-stone-200"
                  }`}
                >
                  {category}
                  <span className={`ml-1 ${isActive ? "text-amber-100" : "text-stone-400"}`}>{count}</span>
                </button>
              );
            })}
          </div>

          <div className="space-y-1.5">
            {activeTasks.map((task) =>
              editingId === task.id ? (
                <TaskInlineForm
                  key={task.id}
                  form={editForm}
                  onChange={setEditForm}
                  onSave={() => {
                    void saveEdit();
                  }}
                  onCancel={cancelEdit}
                  saving={saving}
                />
              ) : (
                <div
                  key={task.id}
                  data-task-id={task.id}
                  draggable={!saving}
                  onDragStart={(event) => {
                    setDraggingId(task.id);
                    setDragOverId(null);
                    event.dataTransfer.effectAllowed = "move";
                    event.dataTransfer.setData("text/plain", task.id);
                  }}
                  onDragOver={(event) => {
                    event.preventDefault();
                    if (draggingId && draggingId !== task.id) {
                      setDragOverId(task.id);
                    }
                  }}
                  onDragLeave={() => {
                    if (dragOverId === task.id) {
                      setDragOverId(null);
                    }
                  }}
                  onDrop={(event) => {
                    event.preventDefault();
                    const droppedTaskId = event.dataTransfer.getData("text/plain") || draggingId;
                    if (droppedTaskId && droppedTaskId !== task.id) {
                      void reorderTask(droppedTaskId, task.id);
                    }
                    setDraggingId(null);
                    setDragOverId(null);
                  }}
                  onDragEnd={() => {
                    setDraggingId(null);
                    setDragOverId(null);
                  }}
                  onTouchStart={() => {
                    if (!saving) {
                      setTouchDraggingId(task.id);
                      setDragOverId(task.id);
                    }
                  }}
                  onTouchMove={(event) => {
                    if (!touchDraggingId) return;
                    const touch = event.touches[0];
                    if (!touch) return;
                    const element = document.elementFromPoint(touch.clientX, touch.clientY);
                    const container = element?.closest("[data-task-id]");
                    const targetTaskId = container?.getAttribute("data-task-id");
                    if (targetTaskId) {
                      setDragOverId(targetTaskId);
                    }
                  }}
                  onTouchEnd={() => {
                    if (touchDraggingId && dragOverId && touchDraggingId !== dragOverId) {
                      void reorderTask(touchDraggingId, dragOverId);
                    }
                    setTouchDraggingId(null);
                    setDragOverId(null);
                  }}
                  onTouchCancel={() => {
                    setTouchDraggingId(null);
                    setDragOverId(null);
                  }}
                  className={`flex items-center gap-2 rounded-xl border border-stone-200/60 bg-stone-50 px-3 py-2 ${
                    dragOverId === task.id ? "ring-2 ring-amber-300" : ""
                  }`}
                >
                  <span
                    className="shrink-0 cursor-grab text-stone-300 active:cursor-grabbing"
                    aria-hidden="true"
                  >
                    <GripVertical size={13} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-medium text-stone-800">{task.name}</p>
                    <p className="text-[10px] text-stone-400">
                      {task.points}pts・{task.frequencyDays}日ごと
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => startEdit(task)}
                    disabled={saving}
                    className="rounded-lg p-1.5 text-stone-400 transition-colors hover:bg-stone-200 hover:text-stone-700 disabled:opacity-40"
                    aria-label={`${task.name}を編集`}
                  >
                    <Pencil size={13} />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      void deleteTask(task.id, task.name);
                    }}
                    disabled={saving}
                    className="rounded-lg p-1.5 text-stone-400 transition-colors hover:bg-red-50 hover:text-red-500 disabled:opacity-40"
                    aria-label={`${task.name}を削除`}
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              )
            )}
            {activeTasks.length === 0 && !addingNew && (
              <p className="px-1 py-2 text-[11px] text-stone-400">タスクなし</p>
            )}
          </div>

          <div className="mt-3">
            {addingNew ? (
              <TaskInlineForm
                form={newForm}
                onChange={setNewForm}
                onSave={() => {
                  void saveNew();
                }}
                onCancel={cancelAdd}
                saving={saving}
              />
            ) : (
              <button
                type="button"
                onClick={startAdd}
                disabled={saving}
                className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-stone-300 py-2.5 text-sm font-medium text-stone-500 transition-colors hover:border-amber-400 hover:bg-amber-50 hover:text-amber-600 disabled:opacity-50"
              >
                <Plus size={15} />
                タスクを追加
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}

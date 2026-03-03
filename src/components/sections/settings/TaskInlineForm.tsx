import { X } from "lucide-react";
import { isTaskCategory, TASK_CATEGORIES } from "@/shared/constants/task";
import type { TaskFormState } from "@/hooks/useTaskManagement";

export function TaskInlineForm({
  form,
  onChange,
  onSave,
  onCancel,
  saving,
}: {
  form: TaskFormState;
  onChange: (form: TaskFormState) => void;
  onSave: () => void;
  onCancel: () => void;
  saving: boolean;
}) {
  return (
    <div className="space-y-2 rounded-xl border border-amber-200 bg-amber-50/40 p-3">
      <div className="flex gap-2">
        <input
          type="text"
          placeholder="タスク名"
          value={form.name}
          onChange={(event) => onChange({ ...form, name: event.target.value })}
          className="flex-1 rounded-lg border border-stone-300 px-2.5 py-1.5 text-xs text-stone-800 focus:outline-none focus:ring-2 focus:ring-amber-300"
        />
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg p-1.5 text-stone-400 transition-colors hover:bg-stone-200"
          aria-label="キャンセル"
        >
          <X size={14} />
        </button>
      </div>
      <select
        value={form.category}
        onChange={(event) =>
          onChange({
            ...form,
            category: isTaskCategory(event.target.value) ? event.target.value : form.category,
          })
        }
        className="w-full rounded-lg border border-stone-300 px-2.5 py-1.5 text-xs text-stone-800 focus:outline-none focus:ring-2 focus:ring-amber-300"
      >
        {TASK_CATEGORIES.map((category) => (
          <option key={category} value={category}>
            {category}
          </option>
        ))}
      </select>
      <div className="flex gap-2">
        <div className="flex-1">
          <label className="mb-0.5 block text-[10px] text-stone-500">ポイント</label>
          <input
            type="number"
            min={1}
            max={999}
            value={form.points}
            onChange={(event) => onChange({ ...form, points: event.target.value })}
            className="w-full rounded-lg border border-stone-300 px-2.5 py-1.5 text-xs text-stone-800 focus:outline-none focus:ring-2 focus:ring-amber-300"
          />
        </div>
        <div className="flex-1">
          <label className="mb-0.5 block text-[10px] text-stone-500">頻度（日）</label>
          <input
            type="number"
            min={1}
            max={365}
            value={form.frequencyDays}
            onChange={(event) => onChange({ ...form, frequencyDays: event.target.value })}
            className="w-full rounded-lg border border-stone-300 px-2.5 py-1.5 text-xs text-stone-800 focus:outline-none focus:ring-2 focus:ring-amber-300"
          />
        </div>
      </div>
      <button
        type="button"
        onClick={onSave}
        disabled={saving || !form.name.trim()}
        className="w-full rounded-lg bg-amber-500 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-amber-600 disabled:opacity-60"
      >
        {saving ? "保存中…" : "保存"}
      </button>
    </div>
  );
}

import { Pencil, Trash2 } from "lucide-react";
import type { Rule } from "@/types";

type RuleItemProps = {
  rule: Rule;
  deletingId: string | null;
  onDelete: (rule: Rule) => void;
  onEdit: (rule: Rule) => void;
};

export function RuleItem({ rule, deletingId, onDelete, onEdit }: RuleItemProps) {
  return (
    <li className="flex items-start gap-3 px-4 py-3">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-stone-800 leading-snug">{rule.title}</p>
        {rule.body && <p className="mt-1 text-sm text-stone-600 whitespace-pre-wrap">{rule.body}</p>}
        <p className="text-xs text-stone-400 mt-1">{rule.createdBy}が作成</p>
      </div>
      <div className="flex items-center gap-1 flex-shrink-0">
        <button
          type="button"
          aria-label="編集"
          onClick={() => onEdit(rule)}
          className="rounded-lg p-1.5 text-stone-300 hover:bg-stone-100 hover:text-stone-500 transition-colors"
        >
          <Pencil size={14} />
        </button>
        <button
          type="button"
          aria-label="削除"
          disabled={deletingId === rule.id}
          onClick={() => onDelete(rule)}
          className="rounded-lg p-1.5 text-stone-300 hover:bg-stone-100 hover:text-stone-500 transition-colors disabled:opacity-40"
        >
          <Trash2 size={14} />
        </button>
      </div>
    </li>
  );
}

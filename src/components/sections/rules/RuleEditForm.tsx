import type { RuleCategory } from "@/types";
import { isRuleCategory } from "@/shared/constants/rule";
import { CATEGORY_EMOJI, CATEGORY_ORDER } from "./constants";

type RuleEditFormProps = {
  title: string;
  body: string;
  category: RuleCategory;
  saving: boolean;
  onTitleChange: (value: string) => void;
  onBodyChange: (value: string) => void;
  onCategoryChange: (value: RuleCategory) => void;
  onCancel: () => void;
  onSubmit: () => Promise<void>;
};

export function RuleEditForm({
  title,
  body,
  category,
  saving,
  onTitleChange,
  onBodyChange,
  onCategoryChange,
  onCancel,
  onSubmit,
}: RuleEditFormProps) {
  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        void onSubmit();
      }}
      className="space-y-2"
    >
      <input
        type="text"
        value={title}
        onChange={(event) => onTitleChange(event.target.value)}
        className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm text-stone-800 focus:outline-none focus:ring-2 focus:ring-amber-300"
        required
        autoFocus
      />
      <textarea
        value={body}
        onChange={(event) => onBodyChange(event.target.value)}
        rows={2}
        className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm text-stone-800 focus:outline-none focus:ring-2 focus:ring-amber-300 resize-none"
      />
      <select
        value={category}
        onChange={(event) => {
          if (isRuleCategory(event.target.value)) {
            onCategoryChange(event.target.value);
          }
        }}
        className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm text-stone-800 focus:outline-none focus:ring-2 focus:ring-amber-300"
      >
        {CATEGORY_ORDER.map((entry) => (
          <option key={entry} value={entry}>
            {CATEGORY_EMOJI[entry]} {entry}
          </option>
        ))}
      </select>
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={saving || !title.trim()}
          className="flex-1 rounded-lg bg-amber-500 py-2 text-sm font-semibold text-white hover:bg-amber-600 transition-colors disabled:opacity-50"
        >
          {saving ? "保存中…" : "保存"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 rounded-lg border border-stone-300 py-2 text-sm font-medium text-stone-600 hover:bg-stone-50 transition-colors"
        >
          キャンセル
        </button>
      </div>
    </form>
  );
}

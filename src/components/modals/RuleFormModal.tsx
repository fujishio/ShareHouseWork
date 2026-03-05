"use client";

import type { RuleCategory } from "@/types";
import { ErrorNotice } from "@/components/RequestStatus";
import { RULE_CATEGORIES } from "@/shared/constants/rule";
import { useRuleFormModal } from "@/hooks/useRuleFormModal";

const CATEGORY_EMOJI: Record<RuleCategory, string> = {
  "ゴミ捨て": "🗑",
  "騒音": "🔇",
  "共用部": "🏠",
  "来客": "🚪",
  "その他": "📋",
};

const CATEGORIES: { value: RuleCategory; label: string }[] = RULE_CATEGORIES.map((value) => ({
  value,
  label: `${CATEGORY_EMOJI[value]} ${value}`,
}));

type Props = {
  onClose: () => void;
};

export default function RuleFormModal({ onClose }: Props) {
  const {
    title,
    body,
    category,
    submitting,
    errorMessage,
    setTitle,
    setBody,
    setCategoryValue,
    submit,
  } = useRuleFormModal(onClose);

  return (
    <>
      <div className="flex items-center justify-between px-4 pt-3 pb-2 border-b border-stone-100 shrink-0">
        <h2 className="text-sm font-bold text-stone-800">ルールを追加</h2>
      </div>

      <form
        onSubmit={(event) => {
          event.preventDefault();
          void submit();
        }}
        className="flex-1 overflow-y-auto px-4 py-3 space-y-3"
      >
        {errorMessage && <ErrorNotice message={errorMessage} />}
        <div>
          <label htmlFor="modal-rule-title" className="mb-1 block text-xs font-medium text-stone-600">
            タイトル
          </label>
          <input
            id="modal-rule-title"
            type="text"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="例: ゴミは前日の夜に出す"
            required
            autoFocus
            className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm text-stone-800 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-amber-300"
          />
        </div>

        <div>
          <label htmlFor="modal-rule-body" className="mb-1 block text-xs font-medium text-stone-600">
            詳細（任意）
          </label>
          <textarea
            id="modal-rule-body"
            value={body}
            onChange={(event) => setBody(event.target.value)}
            placeholder="補足説明があれば記入してください"
            rows={3}
            className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm text-stone-800 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-amber-300 resize-none"
          />
        </div>

        <div>
          <label htmlFor="modal-rule-category" className="mb-1 block text-xs font-medium text-stone-600">
            カテゴリ
          </label>
          <select
            id="modal-rule-category"
            value={category}
            onChange={(event) => setCategoryValue(event.target.value)}
            className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm text-stone-800 focus:outline-none focus:ring-2 focus:ring-amber-300"
          >
            {CATEGORIES.map((entry) => (
              <option key={entry.value} value={entry.value}>
                {entry.label}
              </option>
            ))}
          </select>
        </div>

        <button
          type="submit"
          disabled={submitting || !title.trim()}
          className="w-full rounded-xl bg-amber-500 py-2.5 text-sm font-semibold text-white hover:bg-amber-600 transition-colors disabled:opacity-50"
        >
          {submitting ? "追加中…" : "追加する"}
        </button>
      </form>
    </>
  );
}

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { RuleCategory } from "@/types";
import { ErrorNotice } from "@/components/RequestStatus";
import { getApiErrorMessage } from "@/shared/lib/api-error";
import { showToast } from "@/shared/lib/toast";
import { MEMBER_NAMES } from "@/shared/constants/house";

const CATEGORIES: { value: RuleCategory; label: string }[] = [
  { value: "ゴミ捨て", label: "🗑 ゴミ捨て" },
  { value: "騒音", label: "🔇 騒音" },
  { value: "共用部", label: "🏠 共用部" },
  { value: "来客", label: "🚪 来客" },
  { value: "その他", label: "📋 その他" },
];

type Props = {
  onClose: () => void;
};

export default function RuleFormModal({ onClose }: Props) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [category, setCategory] = useState<RuleCategory>("その他");
  const [createdBy, setCreatedBy] = useState<string>(MEMBER_NAMES[0]);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!title.trim()) return;

    setSubmitting(true);
    setErrorMessage(null);
    try {
      const response = await fetch("/api/rules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          body: body.trim(),
          category,
          createdBy,
          createdAt: new Date().toISOString(),
        }),
      });
      if (!response.ok) {
        const message = await getApiErrorMessage(response, "ルール追加に失敗しました");
        setErrorMessage(message);
        showToast({ level: "error", message });
        return;
      }
      router.refresh();
      showToast({ level: "success", message: "ルールを追加しました" });
      onClose();
    } catch {
      const message = "通信エラーが発生しました";
      setErrorMessage(message);
      showToast({ level: "error", message });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-3 pb-2 border-b border-stone-100 shrink-0">
        <h2 className="text-sm font-bold text-stone-800">ルールを追加</h2>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
        {errorMessage && <ErrorNotice message={errorMessage} />}
        <div>
          <label htmlFor="modal-rule-title" className="mb-1 block text-xs font-medium text-stone-600">
            タイトル
          </label>
          <input
            id="modal-rule-title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
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
            onChange={(e) => setBody(e.target.value)}
            placeholder="補足説明があれば記入してください"
            rows={3}
            className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm text-stone-800 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-amber-300 resize-none"
          />
        </div>

        <div className="flex gap-2">
          <div className="flex-1">
            <label htmlFor="modal-rule-category" className="mb-1 block text-xs font-medium text-stone-600">
              カテゴリ
            </label>
            <select
              id="modal-rule-category"
              value={category}
              onChange={(e) => setCategory(e.target.value as RuleCategory)}
              className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm text-stone-800 focus:outline-none focus:ring-2 focus:ring-amber-300"
            >
              {CATEGORIES.map((cat) => (
                <option key={cat.value} value={cat.value}>
                  {cat.label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex-1">
            <label htmlFor="modal-rule-createdby" className="mb-1 block text-xs font-medium text-stone-600">
              作成者
            </label>
            <select
              id="modal-rule-createdby"
              value={createdBy}
              onChange={(e) => setCreatedBy(e.target.value)}
              className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm text-stone-800 focus:outline-none focus:ring-2 focus:ring-amber-300"
            >
              {MEMBER_NAMES.map((member) => (
                <option key={member} value={member}>
                  {member}
                </option>
              ))}
            </select>
          </div>
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

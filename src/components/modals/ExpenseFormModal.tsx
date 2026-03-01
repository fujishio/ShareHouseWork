"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { EXPENSE_CATEGORIES } from "@/domain/expenses/expense-categories";
import type { ExpenseCategory } from "@/types";
import { ErrorNotice } from "@/components/RequestStatus";
import { getApiErrorMessage } from "@/shared/lib/api-error";
import { showToast } from "@/shared/lib/toast";
import { MEMBER_NAMES } from "@/shared/constants/house";
import { toLocalDateInputValue } from "@/shared/lib/time";

type Props = {
  onClose: () => void;
};

export default function ExpenseFormModal({ onClose }: Props) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState<ExpenseCategory>("消耗品");
  const [purchasedBy, setPurchasedBy] = useState<string>(MEMBER_NAMES[0]);
  const [purchasedAt, setPurchasedAt] = useState(toLocalDateInputValue);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();

    const parsedAmount = Number(amount);
    if (!title.trim() || !Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      return;
    }

    setSubmitting(true);
    setErrorMessage(null);
    try {
      const response = await fetch("/api/expenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          amount: parsedAmount,
          category,
          purchasedBy,
          purchasedAt,
        }),
      });
      if (!response.ok) {
        const message = await getApiErrorMessage(response, "支出の登録に失敗しました");
        setErrorMessage(message);
        showToast({ level: "error", message });
        return;
      }
      router.refresh();
      showToast({ level: "success", message: "支出を登録しました" });
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
        <h2 className="text-sm font-bold text-stone-800">支出を記録</h2>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
        {errorMessage && <ErrorNotice message={errorMessage} />}
        <div>
          <label htmlFor="modal-expense-title" className="mb-1 block text-xs font-medium text-stone-600">
            品目
          </label>
          <input
            id="modal-expense-title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="例: トイレットペーパー"
            required
            autoFocus
            className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm text-stone-800 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-amber-300"
          />
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <label htmlFor="modal-expense-amount" className="mb-1 block text-xs font-medium text-stone-600">
              金額（円）
            </label>
            <input
              id="modal-expense-amount"
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0"
              min={1}
              required
              className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm text-stone-800 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-amber-300"
            />
          </div>

          <div>
            <label htmlFor="modal-expense-date" className="mb-1 block text-xs font-medium text-stone-600">
              購入日
            </label>
            <input
              id="modal-expense-date"
              type="date"
              value={purchasedAt}
              onChange={(e) => setPurchasedAt(e.target.value)}
              required
              className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm text-stone-800 focus:outline-none focus:ring-2 focus:ring-amber-300"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <label htmlFor="modal-expense-category" className="mb-1 block text-xs font-medium text-stone-600">
              カテゴリ
            </label>
            <select
              id="modal-expense-category"
              value={category}
              onChange={(e) => setCategory(e.target.value as ExpenseCategory)}
              className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm text-stone-800 focus:outline-none focus:ring-2 focus:ring-amber-300"
            >
              {EXPENSE_CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="modal-expense-purchasedby" className="mb-1 block text-xs font-medium text-stone-600">
              購入者
            </label>
            <select
              id="modal-expense-purchasedby"
              value={purchasedBy}
              onChange={(e) => setPurchasedBy(e.target.value)}
              className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm text-stone-800 focus:outline-none focus:ring-2 focus:ring-amber-300"
            >
              {MEMBER_NAMES.map((member) => (
                <option key={member} value={member}>{member}</option>
              ))}
            </select>
          </div>
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-xl bg-amber-500 py-2.5 text-sm font-semibold text-white hover:bg-amber-600 transition-colors disabled:opacity-60"
        >
          {submitting ? "保存中…" : "記録する"}
        </button>
      </form>
    </>
  );
}

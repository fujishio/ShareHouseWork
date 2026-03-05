"use client";

import { EXPENSE_CATEGORIES } from "@/domain/expenses/expense-categories";
import { ErrorNotice } from "@/components/RequestStatus";
import { useExpenseFormModal } from "@/hooks/useExpenseFormModal";

type Props = {
  onClose: () => void;
};

export default function ExpenseFormModal({ onClose }: Props) {
  const {
    title,
    amount,
    category,
    purchasedAt,
    submitting,
    errorMessage,
    setTitle,
    setAmount,
    setCategoryValue,
    setPurchasedAt,
    submit,
  } = useExpenseFormModal(onClose);

  return (
    <>
      <div className="flex items-center justify-between px-4 pt-3 pb-2 border-b border-stone-100 shrink-0">
        <h2 className="text-sm font-bold text-stone-800">支出を記録</h2>
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
          <label htmlFor="modal-expense-title" className="mb-1 block text-xs font-medium text-stone-600">
            品目
          </label>
          <input
            id="modal-expense-title"
            type="text"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
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
              onChange={(event) => setAmount(event.target.value)}
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
              onChange={(event) => setPurchasedAt(event.target.value)}
              required
              className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm text-stone-800 focus:outline-none focus:ring-2 focus:ring-amber-300"
            />
          </div>
        </div>

        <div>
          <label htmlFor="modal-expense-category" className="mb-1 block text-xs font-medium text-stone-600">
            カテゴリ
          </label>
          <select
            id="modal-expense-category"
            value={category}
            onChange={(event) => setCategoryValue(event.target.value)}
            className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm text-stone-800 focus:outline-none focus:ring-2 focus:ring-amber-300"
          >
            {EXPENSE_CATEGORIES.map((entry) => (
              <option key={entry} value={entry}>
                {entry}
              </option>
            ))}
          </select>
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

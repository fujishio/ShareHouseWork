"use client";

import { ErrorNotice } from "@/components/RequestStatus";
import { EXPENSE_CATEGORIES } from "@/domain/expenses/expense-categories";
import { useShoppingFormModal } from "@/hooks/useShoppingFormModal";

type Props = {
  onClose: () => void;
};

export default function ShoppingFormModal({ onClose }: Props) {
  const {
    name,
    quantity,
    memo,
    category,
    submitting,
    errorMessage,
    setName,
    setQuantity,
    setMemo,
    setCategoryValue,
    submit,
  } = useShoppingFormModal(onClose);

  return (
    <>
      <div className="flex items-center justify-between px-4 pt-3 pb-2 border-b border-stone-100 shrink-0">
        <h2 className="text-sm font-bold text-stone-800">買い物を追加</h2>
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
          <label htmlFor="modal-shopping-name" className="mb-1 block text-xs font-medium text-stone-600">
            品名
          </label>
          <input
            id="modal-shopping-name"
            type="text"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="例: トイレットペーパー"
            required
            autoFocus
            className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm text-stone-800 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-amber-300"
          />
        </div>

        <div>
          <label htmlFor="modal-shopping-quantity" className="mb-1 block text-xs font-medium text-stone-600">
            数量
          </label>
          <input
            id="modal-shopping-quantity"
            type="text"
            value={quantity}
            onChange={(event) => setQuantity(event.target.value)}
            placeholder="例: 2個"
            className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm text-stone-800 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-amber-300"
          />
        </div>

        <div>
          <label htmlFor="modal-shopping-category" className="mb-1 block text-xs font-medium text-stone-600">
            カテゴリ（費用計上時に使用）
          </label>
          <select
            id="modal-shopping-category"
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

        <div>
          <label htmlFor="modal-shopping-memo" className="mb-1 block text-xs font-medium text-stone-600">
            メモ（任意）
          </label>
          <input
            id="modal-shopping-memo"
            type="text"
            value={memo}
            onChange={(event) => setMemo(event.target.value)}
            placeholder="例: ドラッグストアで買う"
            className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm text-stone-800 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-amber-300"
          />
        </div>

        <button
          type="submit"
          disabled={submitting || !name.trim()}
          className="w-full rounded-xl bg-amber-500 py-2.5 text-sm font-semibold text-white hover:bg-amber-600 transition-colors disabled:opacity-50"
        >
          {submitting ? "追加中…" : "リストに追加する"}
        </button>
      </form>
    </>
  );
}

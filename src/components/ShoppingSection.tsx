"use client";

import { Check, Trash2, RotateCcw } from "lucide-react";
import type { ShoppingItem } from "@/types";
import { EXPENSE_CATEGORIES } from "@/domain/expenses/expense-categories";
import { LoadingNotice } from "./RequestStatus";
import { useShoppingSection } from "@/hooks/useShoppingSection";

type Props = {
  initialItems: ShoppingItem[];
  currentMonth: string;
};

function formatDate(value: string): string {
  const datePart = value.slice(0, 10);
  const [monthLike, dayLike] = datePart.split("-").slice(1);
  if (!monthLike || !dayLike) {
    return value;
  }
  return `${Number(monthLike)}/${Number(dayLike)}`;
}

export default function ShoppingSection({ initialItems, currentMonth }: Props) {
  const {
    activeItems,
    checkedItems,
    recentCheckedItems,
    archivedCheckedItems,
    thisMonthCheckedCount,
    checkingId,
    cancelingId,
    showArchivedPurchasedItems,
    pendingCheckItem,
    pendingAmount,
    pendingCategory,
    setShowArchivedPurchasedItems,
    setPendingAmount,
    setPendingCategoryValue,
    openCheckDialog,
    closeCheckDialog,
    confirmCheck,
    uncheckItem,
    cancelItem,
  } = useShoppingSection({ initialItems, currentMonth });

  return (
    <div className="space-y-4">
      {(checkingId !== null || cancelingId !== null) && (
        <LoadingNotice message="買い物リストを更新中..." />
      )}

      {pendingCheckItem && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/30"
          onClick={closeCheckDialog}
        >
          <div
            className="w-full max-w-md rounded-t-2xl bg-white p-4 space-y-3 pb-8"
            onClick={(event) => event.stopPropagation()}
          >
            <div>
              <p className="text-xs text-stone-400 mb-0.5">購入済みにする</p>
              <p className="text-base font-bold text-stone-800">{pendingCheckItem.name}</p>
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-stone-600">金額（円）</label>
              <input
                type="number"
                value={pendingAmount}
                onChange={(event) => setPendingAmount(event.target.value)}
                placeholder="0"
                min={1}
                autoFocus
                className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm text-stone-800 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-amber-300"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-stone-600">カテゴリ</label>
              <select
                value={pendingCategory}
                onChange={(event) => setPendingCategoryValue(event.target.value)}
                className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm text-stone-800 focus:outline-none focus:ring-2 focus:ring-amber-300"
              >
                {EXPENSE_CATEGORIES.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={() => void confirmCheck(false)}
                className="flex-1 rounded-xl border border-stone-300 py-2.5 text-sm font-semibold text-stone-600 hover:bg-stone-50 transition-colors"
              >
                費用に追加せず完了
              </button>
              <button
                type="button"
                onClick={() => void confirmCheck(true)}
                disabled={!pendingAmount || Number(pendingAmount) <= 0}
                className="flex-1 rounded-xl bg-amber-500 py-2.5 text-sm font-semibold text-white hover:bg-amber-600 transition-colors disabled:opacity-50"
              >
                費用に追加して完了
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="rounded-2xl border border-stone-200/60 bg-white shadow-sm">
        <div className="px-4 pt-4 pb-3 border-b border-stone-100">
          <div>
            <h2 className="font-bold text-stone-800">買うものリスト</h2>
            <p className="mt-0.5 text-xs text-stone-400">
              {activeItems.length === 0 ? "買うものはありません" : `${activeItems.length}件`}
            </p>
          </div>
        </div>

        {activeItems.length === 0 ? (
          <p className="py-8 text-center text-sm text-stone-400">リストは空です</p>
        ) : (
          <ul className="divide-y divide-stone-100">
            {activeItems.map((item) => (
              <li key={item.id} className="flex items-center gap-3 px-4 py-3">
                <button
                  type="button"
                  aria-label="購入済みにする"
                  disabled={checkingId === item.id}
                  onClick={() => openCheckDialog(item)}
                  className="flex-shrink-0 w-6 h-6 rounded-full border-2 border-stone-300 flex items-center justify-center hover:border-amber-400 hover:bg-amber-50 transition-colors disabled:opacity-40"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline gap-2">
                    <p className="text-sm font-medium text-stone-800">{item.name}</p>
                    {item.quantity && item.quantity !== "1" && (
                      <span className="text-xs text-stone-400">{item.quantity}</span>
                    )}
                  </div>
                  {item.memo && <p className="mt-0.5 text-xs text-stone-400">{item.memo}</p>}
                  <p className="mt-0.5 text-xs text-stone-300">
                    {item.addedBy} · {formatDate(item.addedAt)}
                  </p>
                </div>
                <button
                  type="button"
                  aria-label="削除"
                  disabled={cancelingId === item.id}
                  onClick={() => void cancelItem(item)}
                  className="flex-shrink-0 rounded-lg p-1.5 text-stone-300 hover:bg-stone-100 hover:text-stone-500 transition-colors disabled:opacity-40"
                >
                  <Trash2 size={14} />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {checkedItems.length > 0 && (
        <div className="rounded-2xl border border-stone-200/60 bg-white shadow-sm">
          <div className="px-4 pt-4 pb-3 border-b border-stone-100 flex items-center gap-2">
            <Check size={16} className="text-emerald-500" />
            <h2 className="font-bold text-stone-800">購入済み</h2>
            <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-700">
              今月 {thisMonthCheckedCount}件
            </span>
          </div>

          <ul className="divide-y divide-stone-100">
            {recentCheckedItems.map((item) => (
              <li key={item.id} className="flex items-center gap-3 px-4 py-3">
                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-emerald-400 flex items-center justify-center">
                  <Check size={13} className="text-white" strokeWidth={3} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline gap-2">
                    <p className="text-sm font-medium text-stone-400">{item.name}</p>
                    {item.quantity && item.quantity !== "1" && (
                      <span className="text-xs text-stone-300">{item.quantity}</span>
                    )}
                  </div>
                  <p className="mt-0.5 text-xs text-stone-400">
                    {item.checkedBy} · {item.checkedAt ? formatDate(item.checkedAt) : ""}
                  </p>
                </div>
                <button
                  type="button"
                  aria-label="未購入に戻す"
                  disabled={checkingId === item.id}
                  onClick={() => void uncheckItem(item)}
                  className="flex-shrink-0 rounded-lg p-1.5 text-stone-300 hover:bg-stone-100 hover:text-stone-500 transition-colors disabled:opacity-40"
                >
                  <RotateCcw size={14} />
                </button>
              </li>
            ))}
          </ul>

          {archivedCheckedItems.length > 0 && (
            <div className="border-t border-stone-100">
              <button
                type="button"
                onClick={() => setShowArchivedPurchasedItems((prev) => !prev)}
                className="w-full px-4 py-2 text-left text-xs font-medium text-stone-500 hover:bg-stone-50 transition-colors"
              >
                {showArchivedPurchasedItems
                  ? `アーカイブを隠す（${archivedCheckedItems.length}件）`
                  : `アーカイブを表示（${archivedCheckedItems.length}件）`}
              </button>

              {showArchivedPurchasedItems && (
                <ul className="divide-y divide-stone-100 bg-stone-50/40">
                  {archivedCheckedItems.map((item) => (
                    <li key={item.id} className="flex items-center gap-3 px-4 py-3">
                      <div className="flex-shrink-0 w-6 h-6 rounded-full bg-stone-300 flex items-center justify-center">
                        <Check size={13} className="text-white" strokeWidth={3} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-baseline gap-2">
                          <p className="text-sm font-medium text-stone-400">{item.name}</p>
                          {item.quantity && item.quantity !== "1" && (
                            <span className="text-xs text-stone-300">{item.quantity}</span>
                          )}
                        </div>
                        <p className="mt-0.5 text-xs text-stone-400">
                          {item.checkedBy} · {item.checkedAt ? formatDate(item.checkedAt) : ""}
                        </p>
                      </div>
                      <button
                        type="button"
                        aria-label="未購入に戻す"
                        disabled={checkingId === item.id}
                        onClick={() => void uncheckItem(item)}
                        className="flex-shrink-0 rounded-lg p-1.5 text-stone-300 hover:bg-stone-100 hover:text-stone-500 transition-colors disabled:opacity-40"
                      >
                        <RotateCcw size={14} />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

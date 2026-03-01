"use client";

import { useState } from "react";
import { Check, Trash2, RotateCcw } from "lucide-react";
import type { ShoppingItem, ExpenseCategory } from "@/types";
import { EXPENSE_CATEGORIES } from "@/domain/expenses/expense-categories";
import { LoadingNotice } from "./RequestStatus";
import { getApiErrorMessage } from "@/shared/lib/api-error";
import { showToast } from "@/shared/lib/toast";
import { CURRENT_ACTOR, MEMBER_NAMES } from "@/shared/constants/house";

type Props = {
  initialItems: ShoppingItem[];
  currentMonth: string; // "YYYY-MM"
};

const RECENT_PURCHASED_MONTHS = 2;

function formatDate(value: string): string {
  const datePart = value.slice(0, 10);
  const [monthLike, dayLike] = datePart.split("-").slice(1);
  if (!monthLike || !dayLike) {
    return value;
  }
  return `${Number(monthLike)}/${Number(dayLike)}`;
}

function subtractMonths(monthKey: string, months: number): string {
  const [yearText, monthText] = monthKey.split("-");
  const year = Number(yearText);
  const month = Number(monthText);
  if (!Number.isInteger(year) || !Number.isInteger(month)) {
    return monthKey;
  }
  const date = new Date(Date.UTC(year, month - 1, 1));
  date.setUTCMonth(date.getUTCMonth() - months);
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

function isRecentPurchased(checkedAt: string, currentMonth: string): boolean {
  if (checkedAt.length < 7) {
    return false;
  }
  const checkedMonth = checkedAt.slice(0, 7);
  const thresholdMonth = subtractMonths(currentMonth, RECENT_PURCHASED_MONTHS - 1);
  return checkedMonth >= thresholdMonth;
}

export default function ShoppingSection({ initialItems, currentMonth }: Props) {
  const [items, setItems] = useState<ShoppingItem[]>(initialItems);
  const [checkingId, setCheckingId] = useState<number | null>(null);
  const [cancelingId, setCancelingId] = useState<number | null>(null);
  const [showArchivedPurchasedItems, setShowArchivedPurchasedItems] = useState(false);
  const [pendingCheckItem, setPendingCheckItem] = useState<ShoppingItem | null>(null);
  const [pendingAmount, setPendingAmount] = useState("");
  const [pendingPurchasedBy, setPendingPurchasedBy] = useState<string>(CURRENT_ACTOR);
  const [pendingCategory, setPendingCategory] = useState<ExpenseCategory>("消耗品");

  const activeItems = items.filter((item) => !item.canceledAt && !item.checkedAt);
  const checkedItems = items
    .filter((item) => !item.canceledAt && item.checkedAt)
    .sort((a, b) => (b.checkedAt ?? "").localeCompare(a.checkedAt ?? ""));
  const recentCheckedItems = checkedItems.filter(
    (item) => item.checkedAt && isRecentPurchased(item.checkedAt, currentMonth)
  );
  const archivedCheckedItems = checkedItems.filter(
    (item) => item.checkedAt && !isRecentPurchased(item.checkedAt, currentMonth)
  );
  const thisMonthCheckedCount = checkedItems.filter(
    (item) => item.checkedAt?.startsWith(currentMonth)
  ).length;

  function openCheckDialog(item: ShoppingItem) {
    setPendingCheckItem(item);
    setPendingAmount("");
    setPendingPurchasedBy(CURRENT_ACTOR);
    setPendingCategory(item.category ?? "消耗品");
  }

  async function handleConfirmCheck(addToExpenses: boolean) {
    if (!pendingCheckItem) return;
    const item = pendingCheckItem;
    setPendingCheckItem(null);
    setCheckingId(item.id);
    try {
      const checkResponse = await fetch(`/api/shopping/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ checkedBy: pendingPurchasedBy }),
      });
      if (!checkResponse.ok) {
        showToast({
          level: "error",
          message: await getApiErrorMessage(checkResponse, "購入済み更新に失敗しました"),
        });
        return;
      }
      const checkJson = (await checkResponse.json()) as { data: ShoppingItem };
      setItems((prev) => prev.map((i) => (i.id === item.id ? checkJson.data : i)));

      if (addToExpenses) {
        const expenseResponse = await fetch("/api/expenses", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: item.name,
            amount: Number(pendingAmount),
            category: pendingCategory,
            purchasedBy: pendingPurchasedBy,
            purchasedAt: checkJson.data.checkedAt?.slice(0, 10) ?? new Date().toISOString().slice(0, 10),
          }),
        });
        if (!expenseResponse.ok) {
          showToast({
            level: "error",
            message: await getApiErrorMessage(expenseResponse, "費用の登録に失敗しました"),
          });
          showToast({ level: "success", message: "購入済みにしました（費用の登録は失敗しました）" });
          return;
        }
        showToast({ level: "success", message: "購入済みにして費用に追加しました" });
      } else {
        showToast({ level: "success", message: "購入済みにしました" });
      }
    } catch {
      showToast({ level: "error", message: "通信エラーが発生しました" });
    } finally {
      setCheckingId(null);
      setPendingAmount("");
    }
  }

  async function handleUncheck(item: ShoppingItem) {
    setCheckingId(item.id);
    try {
      const response = await fetch(`/api/shopping/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ uncheck: true }),
      });
      if (!response.ok) {
        showToast({
          level: "error",
          message: await getApiErrorMessage(response, "未購入への戻しに失敗しました"),
        });
        return;
      }
      const json = (await response.json()) as { data: ShoppingItem };
      setItems((prev) => prev.map((i) => (i.id === item.id ? json.data : i)));
      showToast({ level: "success", message: "未購入に戻しました" });
    } catch {
      showToast({ level: "error", message: "通信エラーが発生しました" });
    } finally {
      setCheckingId(null);
    }
  }

  async function handleCancel(item: ShoppingItem) {
    setCancelingId(item.id);
    try {
      const response = await fetch(`/api/shopping/${item.id}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ canceledBy: CURRENT_ACTOR }),
      });
      if (!response.ok) {
        showToast({
          level: "error",
          message: await getApiErrorMessage(response, "削除に失敗しました"),
        });
        return;
      }
      const json = (await response.json()) as { data: ShoppingItem };
      setItems((prev) => prev.map((i) => (i.id === item.id ? json.data : i)));
      showToast({ level: "success", message: "項目を削除しました" });
    } catch {
      showToast({ level: "error", message: "通信エラーが発生しました" });
    } finally {
      setCancelingId(null);
    }
  }

  return (
    <div className="space-y-4">
      {(checkingId !== null || cancelingId !== null) && (
        <LoadingNotice message="買い物リストを更新中..." />
      )}

      {/* Purchase confirmation dialog */}
      {pendingCheckItem && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/30"
          onClick={() => setPendingCheckItem(null)}
        >
          <div
            className="w-full max-w-md rounded-t-2xl bg-white p-4 space-y-3 pb-8"
            onClick={(e) => e.stopPropagation()}
          >
            <div>
              <p className="text-xs text-stone-400 mb-0.5">購入済みにする</p>
              <p className="text-base font-bold text-stone-800">{pendingCheckItem.name}</p>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="mb-1 block text-xs font-medium text-stone-600">
                  金額（円）
                </label>
                <input
                  type="number"
                  value={pendingAmount}
                  onChange={(e) => setPendingAmount(e.target.value)}
                  placeholder="0"
                  min={1}
                  autoFocus
                  className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm text-stone-800 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-amber-300"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-stone-600">
                  購入者
                </label>
                <select
                  value={pendingPurchasedBy}
                  onChange={(e) => setPendingPurchasedBy(e.target.value)}
                  className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm text-stone-800 focus:outline-none focus:ring-2 focus:ring-amber-300"
                >
                  {MEMBER_NAMES.map((m) => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-stone-600">
                カテゴリ
              </label>
              <select
                value={pendingCategory}
                onChange={(e) => setPendingCategory(e.target.value as ExpenseCategory)}
                className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm text-stone-800 focus:outline-none focus:ring-2 focus:ring-amber-300"
              >
                {EXPENSE_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={() => handleConfirmCheck(false)}
                className="flex-1 rounded-xl border border-stone-300 py-2.5 text-sm font-semibold text-stone-600 hover:bg-stone-50 transition-colors"
              >
                費用に追加せず完了
              </button>
              <button
                type="button"
                onClick={() => handleConfirmCheck(true)}
                disabled={!pendingAmount || Number(pendingAmount) <= 0}
                className="flex-1 rounded-xl bg-amber-500 py-2.5 text-sm font-semibold text-white hover:bg-amber-600 transition-colors disabled:opacity-50"
              >
                費用に追加して完了
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Shopping list */}
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
          <p className="py-8 text-center text-sm text-stone-400">
            リストは空です
          </p>
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
                  {item.memo && (
                    <p className="mt-0.5 text-xs text-stone-400">{item.memo}</p>
                  )}
                  <p className="mt-0.5 text-xs text-stone-300">
                    {item.addedBy} · {formatDate(item.addedAt)}
                  </p>
                </div>
                <button
                  type="button"
                  aria-label="削除"
                  disabled={cancelingId === item.id}
                  onClick={() => handleCancel(item)}
                  className="flex-shrink-0 rounded-lg p-1.5 text-stone-300 hover:bg-stone-100 hover:text-stone-500 transition-colors disabled:opacity-40"
                >
                  <Trash2 size={14} />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Purchased items */}
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
                  onClick={() => handleUncheck(item)}
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
                        onClick={() => handleUncheck(item)}
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

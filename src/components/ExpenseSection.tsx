"use client";

import { useState } from "react";
import { Trash2 } from "lucide-react";
import type { ExpenseRecord } from "@/types";
import ExpenseCategoryChart from "./ExpenseCategoryChart";
import { LoadingNotice } from "./RequestStatus";
import { getApiErrorMessage } from "@/shared/lib/api-error";
import { showToast } from "@/shared/lib/toast";

type Props = {
  initialExpenses: ExpenseRecord[];
  currentMonth: string;
};

function toMonthPrefix(month: string): string {
  return month.slice(0, 7);
}

function formatPurchaseDateLabel(purchasedAt: string): string {
  const datePart = purchasedAt.slice(0, 10);
  const [monthLike, dayLike] = datePart.split("-").slice(1);
  if (!monthLike || !dayLike) {
    return purchasedAt;
  }
  return `${Number(monthLike)}/${Number(dayLike)}`;
}

export default function ExpenseSection({ initialExpenses, currentMonth }: Props) {
  const [expenses, setExpenses] = useState<ExpenseRecord[]>(initialExpenses);
  const [isHistoryExpanded, setIsHistoryExpanded] = useState(false);
  const [cancelingId, setCancelingId] = useState<number | null>(null);

  const monthPrefix = toMonthPrefix(currentMonth);
  const currentMonthExpenses = expenses.filter(
    (e) => e.purchasedAt.startsWith(monthPrefix) && !e.canceledAt
  );

  const allExpenses = [...expenses].sort(
    (a, b) => new Date(b.purchasedAt).getTime() - new Date(a.purchasedAt).getTime()
  );
  const visibleHistory = isHistoryExpanded ? allExpenses : allExpenses.slice(0, 5);

  async function handleCancel(expense: ExpenseRecord) {
    setCancelingId(expense.id);
    try {
      const response = await fetch(`/api/expenses/${expense.id}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          canceledBy: "あなた",
          cancelReason: "登録間違い",
        }),
      });

      if (!response.ok) {
        showToast({
          level: "error",
          message: await getApiErrorMessage(response, "支出の取消に失敗しました"),
        });
        return;
      }

      const json = (await response.json()) as { data: ExpenseRecord };
      setExpenses((prev) =>
        prev.map((e) => (e.id === expense.id ? json.data : e))
      );
      showToast({ level: "success", message: "支出を取り消しました" });
    } catch {
      showToast({ level: "error", message: "通信エラーが発生しました" });
    } finally {
      setCancelingId(null);
    }
  }

  return (
    <div className="space-y-4">
      {cancelingId !== null && <LoadingNotice message="支出を更新中..." />}

      {/* Category chart */}
      <div className="rounded-2xl border border-stone-200/60 bg-white p-4 shadow-sm">
        <h3 className="mb-3 text-sm font-bold text-stone-800">カテゴリ別内訳</h3>
        <ExpenseCategoryChart expenses={currentMonthExpenses} />
      </div>

      {/* Expense history */}
      <div className="rounded-2xl border border-stone-200/60 bg-white p-4 shadow-sm">
        <h3 className="mb-3 text-sm font-bold text-stone-800">支出履歴</h3>

        {allExpenses.length === 0 ? (
          <p className="py-4 text-center text-sm text-stone-400">まだ支出記録はありません</p>
        ) : (
          <ul className="space-y-2">
            {visibleHistory.map((expense) => {
              const isCanceled = !!expense.canceledAt;
              const dateStr = formatPurchaseDateLabel(expense.purchasedAt);

              return (
                <li
                  key={expense.id}
                  className={`flex items-center gap-3 rounded-xl px-3 py-2.5 ${
                    isCanceled ? "bg-stone-50 opacity-50" : "bg-stone-50"
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className={`truncate text-sm font-medium ${isCanceled ? "line-through text-stone-400" : "text-stone-800"}`}>
                        {expense.title}
                      </p>
                      {isCanceled && (
                        <span className="shrink-0 rounded bg-stone-200 px-1.5 py-0.5 text-xs text-stone-500">
                          取消
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 text-xs text-stone-400">
                      {dateStr} · {expense.purchasedBy} · {expense.category}
                    </p>
                  </div>
                  <span className={`shrink-0 text-sm font-bold ${isCanceled ? "text-stone-400" : "text-red-600"}`}>
                    ¥{expense.amount.toLocaleString()}
                  </span>
                  {!isCanceled && (
                    <button
                      type="button"
                      aria-label="取消"
                      disabled={cancelingId === expense.id}
                      onClick={() => handleCancel(expense)}
                      className="shrink-0 rounded-lg p-1.5 text-stone-400 hover:bg-stone-200 hover:text-stone-600 transition-colors disabled:opacity-40"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        )}

        {allExpenses.length > 5 && (
          <button
            type="button"
            onClick={() => setIsHistoryExpanded((prev) => !prev)}
            className="mt-3 w-full rounded-xl border border-stone-200 py-2 text-xs font-medium text-stone-500 hover:bg-stone-50 transition-colors"
          >
            {isHistoryExpanded ? "折りたたむ" : `残り${allExpenses.length - 5}件を表示`}
          </button>
        )}
      </div>
    </div>
  );
}

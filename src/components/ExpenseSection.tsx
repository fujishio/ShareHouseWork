"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import type {
  BalanceAdjustmentRecord,
  ExpenseRecord,
} from "@/types";
import ExpenseCategoryChart from "./ExpenseCategoryChart";
import { LoadingNotice } from "./RequestStatus";
import { getApiErrorMessage } from "@/shared/lib/api-error";
import { showToast } from "@/shared/lib/toast";
import { apiFetch, readJson } from "@/shared/lib/fetch-client";
import { isDataObjectResponse } from "@/shared/lib/response-guards";
import { toLocalDateInputValue } from "@/shared/lib/time";

type Props = {
  initialExpenses: ExpenseRecord[];
  initialBalanceAdjustments: BalanceAdjustmentRecord[];
  currentMonth: string;
  initialCarryover: number;
  initialMonthlyContribution: number;
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

export default function ExpenseSection({
  initialExpenses,
  initialBalanceAdjustments,
  currentMonth,
  initialCarryover,
  initialMonthlyContribution,
}: Props) {
  const router = useRouter();
  const [expenses, setExpenses] = useState<ExpenseRecord[]>(initialExpenses);
  const [balanceAdjustments, setBalanceAdjustments] = useState<BalanceAdjustmentRecord[]>(
    initialBalanceAdjustments
  );
  const [isHistoryExpanded, setIsHistoryExpanded] = useState(false);
  const [isAdjustmentHistoryExpanded, setIsAdjustmentHistoryExpanded] = useState(false);
  const [cancelingId, setCancelingId] = useState<string | null>(null);
  const [adjustMode, setAdjustMode] = useState<"rewrite" | "amount">("rewrite");
  const [balanceInput, setBalanceInput] = useState("");
  const [adjustReason, setAdjustReason] = useState("");
  const [adjustDate, setAdjustDate] = useState(toLocalDateInputValue);
  const [isAdjusting, setIsAdjusting] = useState(false);

  const monthPrefix = toMonthPrefix(currentMonth);
  const currentMonthExpenses = expenses.filter(
    (e) => e.purchasedAt.startsWith(monthPrefix) && !e.canceledAt
  );

  const monthHistoryExpenses = [...expenses]
    .filter((e) => e.purchasedAt.startsWith(monthPrefix))
    .sort((a, b) => new Date(b.purchasedAt).getTime() - new Date(a.purchasedAt).getTime());
  const visibleHistory = isHistoryExpanded ? monthHistoryExpenses : monthHistoryExpenses.slice(0, 5);
  const monthAdjustments = [...balanceAdjustments]
    .filter((adjustment) => adjustment.adjustedAt.startsWith(monthPrefix))
    .sort((a, b) => new Date(b.adjustedAt).getTime() - new Date(a.adjustedAt).getTime());
  const visibleAdjustments = isAdjustmentHistoryExpanded
    ? monthAdjustments
    : monthAdjustments.slice(0, 5);
  const currentMonthSpent = currentMonthExpenses.reduce((sum, expense) => sum + expense.amount, 0);
  const currentMonthAdjustment = monthAdjustments.reduce((sum, adjustment) => sum + adjustment.amount, 0);
  const currentBalance =
    initialCarryover + initialMonthlyContribution - currentMonthSpent + currentMonthAdjustment;

  async function handleCancel(expense: ExpenseRecord) {
    setCancelingId(expense.id);
    try {
      const response = await apiFetch(`/api/expenses/${expense.id}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
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

      const json = await readJson<{ data: ExpenseRecord }>(
        response,
        isDataObjectResponse<ExpenseRecord>
      );
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

  async function handleSubmitAdjustment(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const normalized = balanceInput.replace(/[,\s]/g, "");
    if (!/^-?\d+$/.test(normalized)) {
      showToast({ level: "error", message: "数値で入力してください" });
      return;
    }
    const parsed = Number(normalized);

    let amount: number;
    if (adjustMode === "rewrite") {
      amount = parsed - currentBalance;
      if (amount === 0) {
        showToast({ level: "error", message: "現在残高と同じです" });
        return;
      }
    } else {
      amount = parsed;
      if (amount === 0) {
        showToast({ level: "error", message: "調整額は0以外を入力してください" });
        return;
      }
    }

    setIsAdjusting(true);
    try {
      const response = await apiFetch("/api/balance-adjustments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount, reason: adjustReason.trim(), adjustedAt: adjustDate }),
      });

      if (!response.ok) {
        showToast({
          level: "error",
          message: await getApiErrorMessage(response, "残高調整の登録に失敗しました"),
        });
        return;
      }

      const json = await readJson<{ data: BalanceAdjustmentRecord }>(
        response,
        isDataObjectResponse<BalanceAdjustmentRecord>
      );
      setBalanceAdjustments((prev) => [json.data, ...prev]);
      setBalanceInput("");
      setAdjustReason("");
      showToast({ level: "success", message: "残高調整を登録しました" });
      router.refresh();
    } catch {
      showToast({ level: "error", message: "通信エラーが発生しました" });
    } finally {
      setIsAdjusting(false);
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

        {monthHistoryExpenses.length === 0 ? (
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

        {monthHistoryExpenses.length > 5 && (
          <button
            type="button"
            onClick={() => setIsHistoryExpanded((prev) => !prev)}
            className="mt-3 w-full rounded-xl border border-stone-200 py-2 text-xs font-medium text-stone-500 hover:bg-stone-50 transition-colors"
          >
            {isHistoryExpanded ? "折りたたむ" : `残り${monthHistoryExpenses.length - 5}件を表示`}
          </button>
        )}
      </div>

      <div id="balance-adjustment" className="rounded-2xl border border-stone-200/60 bg-white p-4 shadow-sm">
        <h3 className="mb-3 text-sm font-bold text-stone-800">残高調整</h3>

        <form onSubmit={handleSubmitAdjustment} className="space-y-3 rounded-xl bg-stone-50 p-3 mb-3">
          {/* Mode toggle */}
          <div className="flex rounded-lg border border-stone-200 bg-white p-0.5 text-xs font-medium">
            <button
              type="button"
              onClick={() => { setAdjustMode("rewrite"); setBalanceInput(""); }}
              className={`flex-1 rounded-md py-1.5 transition-colors ${
                adjustMode === "rewrite"
                  ? "bg-amber-500 text-white"
                  : "text-stone-500 hover:text-stone-700"
              }`}
            >
              残高の直接書き換え
            </button>
            <button
              type="button"
              onClick={() => { setAdjustMode("amount"); setBalanceInput("0"); }}
              className={`flex-1 rounded-md py-1.5 transition-colors ${
                adjustMode === "amount"
                  ? "bg-amber-500 text-white"
                  : "text-stone-500 hover:text-stone-700"
              }`}
            >
              調整額の入力
            </button>
          </div>

          <p className="text-[11px] text-stone-500">
            {adjustMode === "rewrite"
              ? `現在残高 ¥${currentBalance.toLocaleString()} を目標残高へ変更します`
              : "調整額を直接入力します（マイナスで減額）"}
          </p>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label htmlFor="adjust-balance-input" className="mb-1 block text-xs font-medium text-stone-600">
                {adjustMode === "rewrite" ? "目標残高（円）" : "調整額（円）"}
              </label>
              <input
                id="adjust-balance-input"
                type="text"
                required
                value={balanceInput}
                onChange={(e) => setBalanceInput(e.target.value)}
                disabled={isAdjusting}
                placeholder={adjustMode === "rewrite" ? String(currentBalance) : "例: -2000"}
                className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm text-stone-800 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-amber-300"
              />
            </div>
            <div>
              <label htmlFor="adjust-date" className="mb-1 block text-xs font-medium text-stone-600">
                調整日
              </label>
              <input
                id="adjust-date"
                type="date"
                required
                value={adjustDate}
                onChange={(e) => setAdjustDate(e.target.value)}
                disabled={isAdjusting}
                className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm text-stone-800 focus:outline-none focus:ring-2 focus:ring-amber-300"
              />
            </div>
          </div>

          <div>
            <label htmlFor="adjust-reason" className="mb-1 block text-xs font-medium text-stone-600">
              調整理由
            </label>
            <input
              id="adjust-reason"
              type="text"
              required
              value={adjustReason}
              onChange={(e) => setAdjustReason(e.target.value)}
              disabled={isAdjusting}
              placeholder="例: 立替精算"
              className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm text-stone-800 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-amber-300"
            />
          </div>

          <button
            type="submit"
            disabled={isAdjusting}
            className="w-full rounded-xl bg-amber-500 py-2 text-xs font-semibold text-white hover:bg-amber-600 transition-colors disabled:opacity-60"
          >
            {isAdjusting ? "保存中…" : "調整を記録"}
          </button>
        </form>

        <h4 className="mt-4 mb-2 text-xs font-bold text-stone-700">調整履歴</h4>
        {monthAdjustments.length === 0 ? (
          <p className="py-4 text-center text-sm text-stone-400">この月の残高調整はありません</p>
        ) : (
          <ul className="space-y-2">
            {visibleAdjustments.map((adjustment) => {
              const dateStr = formatPurchaseDateLabel(adjustment.adjustedAt);
              const sign = adjustment.amount >= 0 ? "+" : "";
              return (
                <li
                  key={adjustment.id}
                  className="flex items-center gap-3 rounded-xl bg-stone-50 px-3 py-2.5"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-stone-800">{adjustment.reason}</p>
                    <p className="mt-0.5 text-xs text-stone-400">
                      {dateStr} · {adjustment.adjustedBy}
                    </p>
                  </div>
                  <span
                    className={`shrink-0 text-sm font-bold ${
                      adjustment.amount >= 0 ? "text-emerald-600" : "text-red-600"
                    }`}
                  >
                    {sign}¥{adjustment.amount.toLocaleString()}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
        {monthAdjustments.length > 5 && (
          <button
            type="button"
            onClick={() => setIsAdjustmentHistoryExpanded((prev) => !prev)}
            className="mt-3 w-full rounded-xl border border-stone-200 py-2 text-xs font-medium text-stone-500 hover:bg-stone-50 transition-colors"
          >
            {isAdjustmentHistoryExpanded
              ? "折りたたむ"
              : `残り${monthAdjustments.length - 5}件を表示`}
          </button>
        )}
      </div>
    </div>
  );
}

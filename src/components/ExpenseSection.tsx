"use client";

import { useState } from "react";
import { Plus, ChevronDown, ChevronUp, Trash2 } from "lucide-react";
import { EXPENSE_CATEGORIES } from "@/domain/expenses/expense-categories";
import type { ExpenseCategory, ExpenseRecord } from "@/types";
import ExpenseCategoryChart from "./ExpenseCategoryChart";

const MEMBERS = ["家主", "パートナー", "友達１", "友達２"] as const;

type Props = {
  initialExpenses: ExpenseRecord[];
  currentMonth: string;
};

function toMonthPrefix(month: string): string {
  return month.slice(0, 7);
}

function toLocalDateInputValue(date: Date = new Date()): string {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 10);
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
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isHistoryExpanded, setIsHistoryExpanded] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [cancelingId, setCancelingId] = useState<number | null>(null);

  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState<ExpenseCategory>("消耗品");
  const [purchasedBy, setPurchasedBy] = useState<string>(MEMBERS[0]);
  const [purchasedAt, setPurchasedAt] = useState(toLocalDateInputValue);

  const monthPrefix = toMonthPrefix(currentMonth);
  const currentMonthExpenses = expenses.filter(
    (e) => e.purchasedAt.startsWith(monthPrefix) && !e.canceledAt
  );

  const allExpenses = [...expenses].sort(
    (a, b) => new Date(b.purchasedAt).getTime() - new Date(a.purchasedAt).getTime()
  );
  const visibleHistory = isHistoryExpanded ? allExpenses : allExpenses.slice(0, 5);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();

    const parsedAmount = Number(amount);
    if (!title.trim() || !Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      return;
    }

    setSubmitting(true);
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
        return;
      }

      const json = (await response.json()) as { data: ExpenseRecord };
      setExpenses((prev) => [...prev, json.data]);
      setTitle("");
      setAmount("");
      setIsFormOpen(false);
    } finally {
      setSubmitting(false);
    }
  }

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
        return;
      }

      const json = (await response.json()) as { data: ExpenseRecord };
      setExpenses((prev) =>
        prev.map((e) => (e.id === expense.id ? json.data : e))
      );
    } finally {
      setCancelingId(null);
    }
  }

  return (
    <div className="space-y-4">
      {/* Category chart */}
      <div className="rounded-2xl border border-stone-200/60 bg-white p-4 shadow-sm">
        <h3 className="mb-3 text-sm font-bold text-stone-800">カテゴリ別内訳</h3>
        <ExpenseCategoryChart expenses={currentMonthExpenses} />
      </div>

      {/* Add expense */}
      <div className="rounded-2xl border border-stone-200/60 bg-white shadow-sm">
        <button
          type="button"
          onClick={() => setIsFormOpen((prev) => !prev)}
          className="flex w-full items-center justify-between p-4 text-left"
        >
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-amber-500 text-white">
              <Plus size={16} />
            </div>
            <span className="text-sm font-bold text-stone-800">支出を記録する</span>
          </div>
          {isFormOpen ? (
            <ChevronUp size={16} className="text-stone-400" />
          ) : (
            <ChevronDown size={16} className="text-stone-400" />
          )}
        </button>

        {isFormOpen && (
          <form onSubmit={handleSubmit} className="border-t border-stone-100 px-4 pb-4 pt-3 space-y-3">
            <div>
              <label htmlFor="expense-title" className="mb-1 block text-xs font-medium text-stone-600">
                品目
              </label>
              <input
                id="expense-title"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="例: トイレットペーパー"
                required
                className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm text-stone-800 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-amber-300"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label htmlFor="expense-amount" className="mb-1 block text-xs font-medium text-stone-600">
                  金額（円）
                </label>
                <input
                  id="expense-amount"
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
                <label htmlFor="expense-date" className="mb-1 block text-xs font-medium text-stone-600">
                  購入日
                </label>
                <input
                  id="expense-date"
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
                <label htmlFor="expense-category" className="mb-1 block text-xs font-medium text-stone-600">
                  カテゴリ
                </label>
                <select
                  id="expense-category"
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
                <label htmlFor="expense-purchasedby" className="mb-1 block text-xs font-medium text-stone-600">
                  購入者
                </label>
                <select
                  id="expense-purchasedby"
                  value={purchasedBy}
                  onChange={(e) => setPurchasedBy(e.target.value)}
                  className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm text-stone-800 focus:outline-none focus:ring-2 focus:ring-amber-300"
                >
                  {MEMBERS.map((member) => (
                    <option key={member} value={member}>{member}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={() => setIsFormOpen(false)}
                className="flex-1 rounded-xl border border-stone-300 py-2.5 text-sm font-medium text-stone-700 hover:bg-stone-50 transition-colors"
              >
                キャンセル
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="flex-1 rounded-xl bg-amber-500 py-2.5 text-sm font-semibold text-white hover:bg-amber-600 transition-colors disabled:opacity-60"
              >
                {submitting ? "保存中…" : "記録する"}
              </button>
            </div>
          </form>
        )}
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

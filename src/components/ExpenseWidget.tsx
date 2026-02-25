import Link from "next/link";
import type { ExpenseSummary } from "@/types";
import { calculateUsageRate } from "@/domain/expenses/calculate-usage-rate";

type Props = {
  summary: ExpenseSummary;
};

export default function ExpenseWidget({ summary }: Props) {
  const usageRate = calculateUsageRate(summary.totalContributed, summary.totalSpent);

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-stone-200/60 p-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-bold text-stone-800">費用残高</h2>
        <Link
          href="/expenses"
          className="text-xs text-amber-600 hover:underline font-medium"
        >
          詳細を見る →
        </Link>
      </div>

      <p className="text-xs text-stone-400 mb-3">{summary.month}</p>

      {/* Balance highlight */}
      <div className="flex items-baseline gap-1 mb-3">
        <span className="text-2xl font-bold text-stone-800">
          ¥{summary.balance.toLocaleString()}
        </span>
        <span className="text-xs text-stone-400">残高</span>
      </div>

      <div className="grid grid-cols-2 gap-2 text-center">
        <div className="bg-stone-50 rounded-xl py-2.5 px-3">
          <p className="text-xs text-stone-400 mb-0.5">拠出合計</p>
          <p className="text-base font-bold text-stone-700">
            ¥{summary.totalContributed.toLocaleString()}
          </p>
        </div>
        <div className="bg-red-50/60 rounded-xl py-2.5 px-3">
          <p className="text-xs text-red-400 mb-0.5">支出合計</p>
          <p className="text-base font-bold text-red-600">
            ¥{summary.totalSpent.toLocaleString()}
          </p>
        </div>
      </div>

      {/* Usage bar */}
      <div className="mt-3">
        <div className="flex justify-between text-xs text-stone-400 mb-1">
          <span>使用率</span>
          <span>{usageRate}%</span>
        </div>
        <div className="w-full bg-stone-100 rounded-full h-2">
          <div
            className="bg-amber-400 h-2 rounded-full transition-all"
            style={{ width: `${usageRate}%` }}
          />
        </div>
      </div>
    </div>
  );
}

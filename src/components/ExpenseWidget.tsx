import type { ExpenseSummary } from "@/types";

type Props = {
  summary: ExpenseSummary;
};

export default function ExpenseWidget({ summary }: Props) {
  const usageRate = Math.round((summary.totalSpent / summary.totalContributed) * 100);

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-bold text-gray-800">費用残高</h2>
        <a
          href="/expenses"
          className="text-xs text-emerald-600 hover:underline font-medium"
        >
          詳細を見る →
        </a>
      </div>

      <p className="text-xs text-gray-400 mb-3">{summary.month}</p>

      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="bg-blue-50 rounded-xl p-2">
          <p className="text-xs text-blue-500 mb-0.5">拠出合計</p>
          <p className="text-sm font-bold text-blue-700">
            ¥{summary.totalContributed.toLocaleString()}
          </p>
        </div>
        <div className="bg-red-50 rounded-xl p-2">
          <p className="text-xs text-red-400 mb-0.5">支出合計</p>
          <p className="text-sm font-bold text-red-600">
            ¥{summary.totalSpent.toLocaleString()}
          </p>
        </div>
        <div className="bg-emerald-50 rounded-xl p-2">
          <p className="text-xs text-emerald-500 mb-0.5">残高</p>
          <p className="text-sm font-bold text-emerald-700">
            ¥{summary.balance.toLocaleString()}
          </p>
        </div>
      </div>

      {/* Usage bar */}
      <div className="mt-3">
        <div className="flex justify-between text-xs text-gray-400 mb-1">
          <span>使用率</span>
          <span>{usageRate}%</span>
        </div>
        <div className="w-full bg-gray-100 rounded-full h-2">
          <div
            className="bg-emerald-400 h-2 rounded-full transition-all"
            style={{ width: `${usageRate}%` }}
          />
        </div>
      </div>
    </div>
  );
}

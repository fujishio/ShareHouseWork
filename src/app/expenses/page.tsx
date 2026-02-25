import { Wallet } from "lucide-react";
import { readExpenses } from "@/server/expense-store";
import { readContributionSettings } from "@/server/contribution-settings-store";
import { calculateUsageRate } from "@/domain/expenses/calculate-usage-rate";
import ExpenseSection from "@/components/ExpenseSection";

const JST_TIMEZONE = "Asia/Tokyo";

function getJstYearMonth(date: Date): { year: number; month: number } {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: JST_TIMEZONE,
    year: "numeric",
    month: "2-digit",
  }).formatToParts(date);
  const year = Number(parts.find((part) => part.type === "year")?.value);
  const month = Number(parts.find((part) => part.type === "month")?.value);
  return { year, month };
}

function toMonthKey(date: Date): string {
  const { year, month } = getJstYearMonth(date);
  return `${year}-${String(month).padStart(2, "0")}`;
}

function toJpMonthLabel(date: Date): string {
  const { year, month } = getJstYearMonth(date);
  return `${year}年${month}月`;
}

export default async function ExpensesPage() {
  const now = new Date();
  const monthKey = toMonthKey(now);
  const monthLabel = toJpMonthLabel(now);

  const [allExpenses, settings] = await Promise.all([
    readExpenses(),
    readContributionSettings(),
  ]);

  const currentMonthExpenses = allExpenses.filter(
    (e) => e.purchasedAt.startsWith(monthKey) && !e.canceledAt
  );

  const totalContributed = settings.monthlyAmountPerPerson * settings.memberCount;
  const totalSpent = currentMonthExpenses.reduce((sum, e) => sum + e.amount, 0);
  const balance = totalContributed - totalSpent;
  const usageRate = calculateUsageRate(totalContributed, totalSpent);

  const balanceColor =
    balance < 0 ? "text-red-600" : balance < totalContributed * 0.1 ? "text-amber-600" : "text-stone-800";

  return (
    <div className="space-y-4">
      {/* Summary card */}
      <div className="rounded-2xl border border-stone-200/60 bg-white p-4 shadow-sm">
        <div className="flex items-center gap-2 mb-1">
          <Wallet size={18} className="text-amber-500" />
          <h2 className="font-bold text-stone-800">費用残高</h2>
        </div>
        <p className="text-xs text-stone-400 mb-3">{monthLabel}</p>

        <div className="flex items-baseline gap-1 mb-3">
          <span className={`text-3xl font-bold ${balanceColor}`}>
            ¥{balance.toLocaleString()}
          </span>
          <span className="text-xs text-stone-400">残高</span>
        </div>

        <div className="grid grid-cols-2 gap-2 text-center mb-3">
          <div className="rounded-xl bg-stone-50 px-3 py-2.5">
            <p className="text-xs text-stone-400 mb-0.5">拠出合計</p>
            <p className="text-base font-bold text-stone-700">
              ¥{totalContributed.toLocaleString()}
            </p>
            <p className="text-xs text-stone-400">
              ¥{settings.monthlyAmountPerPerson.toLocaleString()} × {settings.memberCount}人
            </p>
          </div>
          <div className="rounded-xl bg-red-50/60 px-3 py-2.5">
            <p className="text-xs text-red-400 mb-0.5">支出合計</p>
            <p className="text-base font-bold text-red-600">
              ¥{totalSpent.toLocaleString()}
            </p>
            <p className="text-xs text-stone-400">{currentMonthExpenses.length}件</p>
          </div>
        </div>

        <div>
          <div className="flex justify-between text-xs text-stone-400 mb-1">
            <span>使用率</span>
            <span className={usageRate >= 90 ? "text-red-500 font-semibold" : ""}>{usageRate}%</span>
          </div>
          <div className="w-full bg-stone-100 rounded-full h-2">
            <div
              className={`h-2 rounded-full transition-all ${
                usageRate >= 90 ? "bg-red-400" : usageRate >= 70 ? "bg-amber-400" : "bg-emerald-400"
              }`}
              style={{ width: `${usageRate}%` }}
            />
          </div>
        </div>
      </div>

      <ExpenseSection initialExpenses={allExpenses} currentMonth={monthKey} />
    </div>
  );
}

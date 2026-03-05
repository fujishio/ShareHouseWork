export const dynamic = "force-dynamic";

import { toJstMonthKey } from "@/shared/lib/time";
import { Wallet } from "lucide-react";
import { readExpenses } from "@/server/expense-store";
import { readBalanceAdjustments } from "@/server/balance-adjustment-store";
import { readContributionSettingsHistory } from "@/server/contribution-settings-store";
import { calculateMonthlyExpenseSummary } from "@/domain/expenses/calculate-monthly-expense-summary";
import ExpenseSection from "@/components/ExpenseSection";
import ExpenseMonthNav from "@/components/ExpenseMonthNav";
import { getHouse } from "@/server/house-store";
import { resolveRequestHouseId } from "@/server/request-house";

const MONTH_KEY_REGEX = /^\d{4}-\d{2}$/;

function toLabelFromMonthKey(monthKey: string): string {
  if (!MONTH_KEY_REGEX.test(monthKey)) return monthKey;
  const [year, month] = monthKey.split("-");
  return `${year}年${Number(month)}月`;
}

function subtractOneMonth(monthKey: string): string {
  const [yearText, monthText] = monthKey.split("-");
  const year = Number(yearText);
  const month = Number(monthText);
  if (month === 1) return `${year - 1}-12`;
  return `${year}-${String(month - 1).padStart(2, "0")}`;
}

function addOneMonth(monthKey: string): string {
  const [yearText, monthText] = monthKey.split("-");
  const year = Number(yearText);
  const month = Number(monthText);
  if (month === 12) return `${year + 1}-01`;
  return `${year}-${String(month + 1).padStart(2, "0")}`;
}

function toMonthKeyFromIsoDateTime(value: string | undefined): string | undefined {
  if (!value) return undefined;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return undefined;
  return toJstMonthKey(date);
}

type SearchParams = { month?: string };

function resolveTargetMonth(searchParams: SearchParams | undefined, now: Date): string {
  const currentMonthKey = toJstMonthKey(now);
  const value = searchParams?.month;
  if (typeof value === "string" && MONTH_KEY_REGEX.test(value)) {
    return value <= currentMonthKey ? value : currentMonthKey;
  }
  return currentMonthKey;
}

export default async function ExpensesPage({
  searchParams,
}: {
  searchParams?: Promise<SearchParams>;
}) {
  const now = new Date();
  const currentMonthKey = toJstMonthKey(now);
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const targetMonthKey = resolveTargetMonth(resolvedSearchParams, now);
  const monthLabel = toLabelFromMonthKey(targetMonthKey);

  const prevMonthKey = subtractOneMonth(targetMonthKey);
  const nextMonthKey = addOneMonth(targetMonthKey);
  const canGoNext = targetMonthKey < currentMonthKey;

  const houseId = await resolveRequestHouseId();
  if (!houseId) {
    return (
      <div className="space-y-4">
        <section className="rounded-2xl border border-stone-200/60 bg-white p-4 shadow-sm">
          <h3 className="font-bold text-stone-800">費用管理</h3>
          <p className="mt-2 text-sm text-stone-500">ハウスに参加すると費用情報が表示されます。</p>
        </section>
      </div>
    );
  }
  const house = await getHouse(houseId);
  const carryoverStartMonthKey = toMonthKeyFromIsoDateTime(house?.createdAt);
  const [allExpenses, balanceAdjustments, contributionHistory] = await Promise.all([
    readExpenses(houseId),
    readBalanceAdjustments(houseId),
    readContributionSettingsHistory(houseId),
  ]);

  const summary = calculateMonthlyExpenseSummary(
    targetMonthKey,
    allExpenses,
    balanceAdjustments,
    contributionHistory,
    { carryoverStartMonthKey }
  );
  const targetMonthExpenses = allExpenses.filter(
    (e) => e.purchasedAt.startsWith(targetMonthKey) && !e.canceledAt
  );

  const balanceColor =
    summary.balance < 0
      ? "text-red-600"
      : summary.balance < summary.monthlyContribution * 0.1
        ? "text-amber-600"
        : "text-stone-800";

  return (
    <div className="space-y-4">
      {/* Month navigation */}
      <ExpenseMonthNav
        monthLabel={monthLabel}
        prevMonthKey={prevMonthKey}
        nextMonthKey={nextMonthKey}
        canGoNext={canGoNext}
      />

      {/* Summary card */}
      <div className="rounded-2xl border border-stone-200/60 bg-white p-4 shadow-sm">
        <div className="flex items-center gap-2 mb-3">
          <Wallet size={18} className="text-amber-500" />
          <h2 className="font-bold text-stone-800">費用残高</h2>
          <a
            href="#balance-adjustment"
            className="ml-auto text-xs text-amber-500 hover:text-amber-600"
          >
            残高調整 →
          </a>
        </div>

        <div className="flex items-baseline gap-1 mb-1">
          <span className={`text-3xl font-bold ${balanceColor}`}>
            ¥{summary.balance.toLocaleString()}
          </span>
          <span className="text-xs text-stone-400">残高</span>
        </div>

        {summary.carryover !== 0 ? (
          <p className={`text-xs mb-3 ${summary.carryover >= 0 ? "text-stone-400" : "text-red-400"}`}>
            前月繰越 {summary.carryover >= 0 ? "+" : ""}¥{summary.carryover.toLocaleString()}
          </p>
        ) : (
          <div className="mb-3" />
        )}

        <div className="grid grid-cols-2 gap-2 text-center mb-3">
          <div className="rounded-xl bg-stone-50 px-3 py-2.5">
            <p className="text-xs text-stone-400 mb-0.5">当月拠出</p>
            <p className="text-base font-bold text-stone-700">
              ¥{summary.monthlyContribution.toLocaleString()}
            </p>
          </div>
          <div className="rounded-xl bg-red-50/60 px-3 py-2.5">
            <p className="text-xs text-red-400 mb-0.5">当月支出</p>
            <p className="text-base font-bold text-red-600">
              ¥{summary.monthlySpent.toLocaleString()}
            </p>
            <p className="text-xs text-stone-400">{targetMonthExpenses.length}件</p>
          </div>
        </div>

        {summary.monthlyAdjustment !== 0 && (
          <p className={`mb-3 text-xs ${summary.monthlyAdjustment > 0 ? "text-emerald-600" : "text-red-500"}`}>
            当月残高調整 {summary.monthlyAdjustment > 0 ? "+" : ""}¥
            {summary.monthlyAdjustment.toLocaleString()}
          </p>
        )}

        <div>
          <div className="flex justify-between text-xs text-stone-400 mb-1">
            <span>年間使用率</span>
            <span className={summary.usageRate >= 90 ? "text-red-500 font-semibold" : ""}>
              {summary.usageRate}%
            </span>
          </div>
          <div className="w-full bg-stone-100 rounded-full h-2">
            <div
              className={`h-2 rounded-full transition-all ${
                summary.usageRate >= 90
                  ? "bg-red-400"
                  : summary.usageRate >= 70
                    ? "bg-amber-400"
                    : "bg-emerald-400"
              }`}
              style={{ width: `${summary.usageRate}%` }}
            />
          </div>
        </div>
      </div>

      <ExpenseSection
        initialExpenses={allExpenses}
        initialBalanceAdjustments={balanceAdjustments}
        currentMonth={targetMonthKey}
        initialCarryover={summary.carryover}
        initialMonthlyContribution={summary.monthlyContribution}
      />
    </div>
  );
}

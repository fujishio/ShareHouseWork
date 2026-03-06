import type {
  BalanceAdjustmentRecord,
  ContributionSettingsHistoryRecord,
  ExpenseRecord,
} from "@/types";
import { addOneMonth } from "@/shared/lib/month-utils";

const MONTH_KEY_REGEX = /^\d{4}-\d{2}$/;

function compareMonthKey(a: string, b: string): number {
  return a.localeCompare(b);
}

function firstMonthOfYear(monthKey: string): string {
  return `${monthKey.slice(0, 4)}-01`;
}

function resolveMonthlyContribution(
  history: ContributionSettingsHistoryRecord[],
  monthKey: string
): number {
  const sorted = [...history].sort((a, b) => compareMonthKey(a.effectiveMonth, b.effectiveMonth));
  let selected: ContributionSettingsHistoryRecord | null = null;

  for (const record of sorted) {
    if (record.effectiveMonth <= monthKey) {
      selected = record;
      continue;
    }
    break;
  }

  if (!selected) {
    return 0;
  }

  return selected.monthlyAmountPerPerson * selected.memberCount;
}

type Result = {
  monthKey: string;
  carryover: number;
  monthlyContribution: number;
  monthlySpent: number;
  monthlyAdjustment: number;
  balance: number;
};

type Options = {
  carryoverStartMonthKey?: string;
};

export function calculateMonthlyExpenseSummary(
  targetMonthKey: string,
  expenses: ExpenseRecord[],
  balanceAdjustments: BalanceAdjustmentRecord[],
  contributionHistory: ContributionSettingsHistoryRecord[],
  options?: Options
): Result {
  if (!MONTH_KEY_REGEX.test(targetMonthKey)) {
    throw new Error("targetMonthKey must be YYYY-MM");
  }
  if (contributionHistory.length === 0) {
    throw new Error("contributionHistory is required");
  }

  const spentByMonth = expenses.reduce<Record<string, number>>((acc, expense) => {
    if (expense.canceledAt) {
      return acc;
    }
    const monthKey = expense.purchasedAt.slice(0, 7);
    if (!MONTH_KEY_REGEX.test(monthKey)) {
      return acc;
    }
    acc[monthKey] = (acc[monthKey] ?? 0) + expense.amount;
    return acc;
  }, {});
  const adjustmentByMonth = balanceAdjustments.reduce<Record<string, number>>((acc, adjustment) => {
    const monthKey = adjustment.adjustedAt.slice(0, 7);
    if (!MONTH_KEY_REGEX.test(monthKey)) {
      return acc;
    }
    acc[monthKey] = (acc[monthKey] ?? 0) + adjustment.amount;
    return acc;
  }, {});

  const yearStartMonth = firstMonthOfYear(targetMonthKey);
  const carryoverStartMonth =
    options?.carryoverStartMonthKey && MONTH_KEY_REGEX.test(options.carryoverStartMonthKey)
      ? options.carryoverStartMonthKey
      : yearStartMonth;
  const startMonth =
    compareMonthKey(carryoverStartMonth, yearStartMonth) > 0
      ? carryoverStartMonth
      : yearStartMonth;

  if (compareMonthKey(targetMonthKey, startMonth) < 0) {
    return {
      monthKey: targetMonthKey,
      carryover: 0,
      monthlyContribution: 0,
      monthlySpent: 0,
      monthlyAdjustment: 0,
      balance: 0,
    };
  }

  let carryover = 0;
  let monthKey = startMonth;
  while (compareMonthKey(monthKey, targetMonthKey) < 0) {
    const contribution = resolveMonthlyContribution(contributionHistory, monthKey);
    const spent = spentByMonth[monthKey] ?? 0;
    const adjustment = adjustmentByMonth[monthKey] ?? 0;
    carryover += contribution - spent + adjustment;
    monthKey = addOneMonth(monthKey);
  }

  const monthlyContribution = resolveMonthlyContribution(contributionHistory, targetMonthKey);
  const monthlySpent = spentByMonth[targetMonthKey] ?? 0;
  const monthlyAdjustment = adjustmentByMonth[targetMonthKey] ?? 0;
  const balance = carryover + monthlyContribution - monthlySpent + monthlyAdjustment;

  return {
    monthKey: targetMonthKey,
    carryover,
    monthlyContribution,
    monthlySpent,
    monthlyAdjustment,
    balance,
  };
}

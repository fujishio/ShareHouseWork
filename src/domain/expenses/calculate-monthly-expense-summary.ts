import type {
  ContributionSettingsHistoryRecord,
  ExpenseRecord,
} from "@/types";
import { calculateUsageRate } from "./calculate-usage-rate.ts";

const MONTH_KEY_REGEX = /^\d{4}-\d{2}$/;

function compareMonthKey(a: string, b: string): number {
  return a.localeCompare(b);
}

function addOneMonth(monthKey: string): string {
  const [yearText, monthText] = monthKey.split("-");
  const year = Number(yearText);
  const month = Number(monthText);
  if (!Number.isInteger(year) || !Number.isInteger(month) || month < 1 || month > 12) {
    return monthKey;
  }
  if (month === 12) {
    return `${year + 1}-01`;
  }
  return `${year}-${String(month + 1).padStart(2, "0")}`;
}

function firstMonthOfYear(monthKey: string): string {
  return `${monthKey.slice(0, 4)}-01`;
}

function resolveMonthlyContribution(
  history: ContributionSettingsHistoryRecord[],
  monthKey: string
): number {
  const sorted = [...history].sort((a, b) => compareMonthKey(a.effectiveMonth, b.effectiveMonth));
  let selected = sorted[0];

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
  balance: number;
  usageRate: number;
};

export function calculateMonthlyExpenseSummary(
  targetMonthKey: string,
  expenses: ExpenseRecord[],
  contributionHistory: ContributionSettingsHistoryRecord[]
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

  const startMonth = firstMonthOfYear(targetMonthKey);

  let carryover = 0;
  let monthKey = startMonth;
  while (compareMonthKey(monthKey, targetMonthKey) < 0) {
    const contribution = resolveMonthlyContribution(contributionHistory, monthKey);
    const spent = spentByMonth[monthKey] ?? 0;
    carryover += contribution - spent;
    monthKey = addOneMonth(monthKey);
  }

  const monthlyContribution = resolveMonthlyContribution(contributionHistory, targetMonthKey);
  const monthlySpent = spentByMonth[targetMonthKey] ?? 0;
  const balance = carryover + monthlyContribution - monthlySpent;

  const ytdStart = firstMonthOfYear(targetMonthKey);
  let yearContributed = 0;
  let yearSpent = 0;
  monthKey = ytdStart;
  while (compareMonthKey(monthKey, targetMonthKey) <= 0) {
    yearContributed += resolveMonthlyContribution(contributionHistory, monthKey);
    yearSpent += spentByMonth[monthKey] ?? 0;
    monthKey = addOneMonth(monthKey);
  }

  return {
    monthKey: targetMonthKey,
    carryover,
    monthlyContribution,
    monthlySpent,
    balance,
    usageRate: calculateUsageRate(yearContributed, yearSpent),
  };
}

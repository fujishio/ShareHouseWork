import test from "node:test";
import assert from "node:assert/strict";
import { calculateMonthlyExpenseSummary } from "./calculate-monthly-expense-summary.ts";
import type { ContributionSettingsHistoryRecord, ExpenseRecord } from "@/types";

test("過去月を指定すると当該月の残高と繰越を取得できる", () => {
  const history: ContributionSettingsHistoryRecord[] = [
    { effectiveMonth: "2026-01", monthlyAmountPerPerson: 10000, memberCount: 2 },
  ];
  const expenses: ExpenseRecord[] = [
    {
      id: 1,
      title: "1月支出",
      amount: 5000,
      category: "日用品",
      purchasedBy: "家主",
      purchasedAt: "2026-01-10",
    },
    {
      id: 2,
      title: "2月支出",
      amount: 3000,
      category: "日用品",
      purchasedBy: "家主",
      purchasedAt: "2026-02-08",
    },
  ];

  const january = calculateMonthlyExpenseSummary("2026-01", expenses, history);
  assert.equal(january.carryover, 0);
  assert.equal(january.monthlyContribution, 20000);
  assert.equal(january.monthlySpent, 5000);
  assert.equal(january.balance, 15000);

  const february = calculateMonthlyExpenseSummary("2026-02", expenses, history);
  assert.equal(february.carryover, 15000);
  assert.equal(february.monthlyContribution, 20000);
  assert.equal(february.monthlySpent, 3000);
  assert.equal(february.balance, 32000);
});

test("設定変更は有効月以降にのみ反映される", () => {
  const history: ContributionSettingsHistoryRecord[] = [
    { effectiveMonth: "2026-01", monthlyAmountPerPerson: 10000, memberCount: 2 }, // 20,000
    { effectiveMonth: "2026-03", monthlyAmountPerPerson: 15000, memberCount: 2 }, // 30,000
  ];
  const expenses: ExpenseRecord[] = [];

  const february = calculateMonthlyExpenseSummary("2026-02", expenses, history);
  assert.equal(february.monthlyContribution, 20000);

  const march = calculateMonthlyExpenseSummary("2026-03", expenses, history);
  assert.equal(march.monthlyContribution, 30000);
  assert.equal(march.carryover, 40000);
  assert.equal(march.balance, 70000);
});

test("1月は前年から繰越しない（年内繰越のみ）", () => {
  const history: ContributionSettingsHistoryRecord[] = [
    { effectiveMonth: "2025-12", monthlyAmountPerPerson: 10000, memberCount: 2 }, // 20,000
  ];
  const expenses: ExpenseRecord[] = [
    {
      id: 1,
      title: "12月支出",
      amount: 12000,
      category: "食費",
      purchasedBy: "家主",
      purchasedAt: "2025-12-20",
    },
  ];

  const january = calculateMonthlyExpenseSummary("2026-01", expenses, history);
  assert.equal(january.carryover, 0);
  assert.equal(january.monthlyContribution, 20000);
  assert.equal(january.balance, 20000);
});

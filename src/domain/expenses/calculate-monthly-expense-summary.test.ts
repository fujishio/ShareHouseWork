import test from "node:test";
import assert from "node:assert/strict";
import { calculateMonthlyExpenseSummary } from "./calculate-monthly-expense-summary.ts";
import type {
  BalanceAdjustmentRecord,
  ContributionSettingsHistoryRecord,
  ExpenseRecord,
} from "@/types";

test("過去月を指定すると当該月の残高と繰越を取得できる", () => {
  const history: ContributionSettingsHistoryRecord[] = [
    { houseId: "h1", effectiveMonth: "2026-01", monthlyAmountPerPerson: 10000, memberCount: 2 },
  ];
  const expenses: ExpenseRecord[] = [
    {
      id: "1",
      houseId: "h1",
      title: "1月支出",
      amount: 5000,
      category: "日用品",
      purchasedBy: "家主",
      purchasedAt: "2026-01-10",
    },
    {
      id: "2",
      houseId: "h1",
      title: "2月支出",
      amount: 3000,
      category: "日用品",
      purchasedBy: "家主",
      purchasedAt: "2026-02-08",
    },
  ];
  const adjustments: BalanceAdjustmentRecord[] = [];

  const january = calculateMonthlyExpenseSummary("2026-01", expenses, adjustments, history);
  assert.equal(january.carryover, 0);
  assert.equal(january.monthlyContribution, 20000);
  assert.equal(january.monthlySpent, 5000);
  assert.equal(january.monthlyAdjustment, 0);
  assert.equal(january.balance, 15000);

  const february = calculateMonthlyExpenseSummary("2026-02", expenses, adjustments, history);
  assert.equal(february.carryover, 15000);
  assert.equal(february.monthlyContribution, 20000);
  assert.equal(february.monthlySpent, 3000);
  assert.equal(february.monthlyAdjustment, 0);
  assert.equal(february.balance, 32000);
});

test("設定変更は有効月以降にのみ反映される", () => {
  const history: ContributionSettingsHistoryRecord[] = [
    { houseId: "h1", effectiveMonth: "2026-01", monthlyAmountPerPerson: 10000, memberCount: 2 }, // 20,000
    { houseId: "h1", effectiveMonth: "2026-03", monthlyAmountPerPerson: 15000, memberCount: 2 }, // 30,000
  ];
  const expenses: ExpenseRecord[] = [];
  const adjustments: BalanceAdjustmentRecord[] = [];

  const february = calculateMonthlyExpenseSummary("2026-02", expenses, adjustments, history);
  assert.equal(february.monthlyContribution, 20000);

  const march = calculateMonthlyExpenseSummary("2026-03", expenses, adjustments, history);
  assert.equal(march.monthlyContribution, 30000);
  assert.equal(march.carryover, 40000);
  assert.equal(march.balance, 70000);
});

test("1月は前年から繰越しない（年内繰越のみ）", () => {
  const history: ContributionSettingsHistoryRecord[] = [
    { houseId: "h1", effectiveMonth: "2025-12", monthlyAmountPerPerson: 10000, memberCount: 2 }, // 20,000
  ];
  const expenses: ExpenseRecord[] = [
    {
      id: "1",
      houseId: "h1",
      title: "12月支出",
      amount: 12000,
      category: "食費",
      purchasedBy: "家主",
      purchasedAt: "2025-12-20",
    },
  ];
  const adjustments: BalanceAdjustmentRecord[] = [];

  const january = calculateMonthlyExpenseSummary("2026-01", expenses, adjustments, history);
  assert.equal(january.carryover, 0);
  assert.equal(january.monthlyContribution, 20000);
  assert.equal(january.balance, 20000);
});

test("取消済み支出は集計対象外になる", () => {
  const history: ContributionSettingsHistoryRecord[] = [
    { houseId: "h1", effectiveMonth: "2026-01", monthlyAmountPerPerson: 10000, memberCount: 2 },
  ];
  const expenses: ExpenseRecord[] = [
    {
      id: "1",
      houseId: "h1",
      title: "通常支出",
      amount: 3000,
      category: "日用品",
      purchasedBy: "家主",
      purchasedAt: "2026-01-10",
    },
    {
      id: "2",
      houseId: "h1",
      title: "取消済み支出",
      amount: 8000,
      category: "日用品",
      purchasedBy: "家主",
      purchasedAt: "2026-01-20",
      canceledAt: "2026-01-21",
      canceledBy: "家主",
      cancelReason: "重複",
    },
  ];
  const adjustments: BalanceAdjustmentRecord[] = [];

  const january = calculateMonthlyExpenseSummary("2026-01", expenses, adjustments, history);
  assert.equal(january.monthlySpent, 3000);
  assert.equal(january.balance, 17000);
});

test("残高調整は当月残高と翌月繰越に反映される", () => {
  const history: ContributionSettingsHistoryRecord[] = [
    { houseId: "h1", effectiveMonth: "2026-01", monthlyAmountPerPerson: 10000, memberCount: 2 },
  ];
  const expenses: ExpenseRecord[] = [];
  const adjustments: BalanceAdjustmentRecord[] = [
    {
      id: "a1",
      houseId: "h1",
      amount: -2000,
      reason: "現金差額調整",
      adjustedBy: "家主",
      adjustedAt: "2026-01-12",
    },
    {
      id: "a2",
      houseId: "h1",
      amount: 1000,
      reason: "立替精算",
      adjustedBy: "家主",
      adjustedAt: "2026-02-02",
    },
  ];

  const january = calculateMonthlyExpenseSummary("2026-01", expenses, adjustments, history);
  assert.equal(january.monthlyAdjustment, -2000);
  assert.equal(january.balance, 18000);

  const february = calculateMonthlyExpenseSummary("2026-02", expenses, adjustments, history);
  assert.equal(february.carryover, 18000);
  assert.equal(february.monthlyAdjustment, 1000);
  assert.equal(february.balance, 39000);
});

test("targetMonthKeyが不正な形式なら例外", () => {
  const history: ContributionSettingsHistoryRecord[] = [
    { houseId: "h1", effectiveMonth: "2026-01", monthlyAmountPerPerson: 10000, memberCount: 2 },
  ];

  assert.throws(() => calculateMonthlyExpenseSummary("2026/01", [], [], history), {
    message: "targetMonthKey must be YYYY-MM",
  });
});

test("繰越開始月より前の月は残高を0として扱う", () => {
  const history: ContributionSettingsHistoryRecord[] = [
    { houseId: "h1", effectiveMonth: "2000-01", monthlyAmountPerPerson: 10000, memberCount: 2 },
  ];

  const january = calculateMonthlyExpenseSummary("2026-01", [], [], history, {
    carryoverStartMonthKey: "2026-03",
  });
  assert.equal(january.carryover, 0);
  assert.equal(january.monthlyContribution, 0);
  assert.equal(january.monthlyAdjustment, 0);
  assert.equal(january.balance, 0);

  const march = calculateMonthlyExpenseSummary("2026-03", [], [], history, {
    carryoverStartMonthKey: "2026-03",
  });
  assert.equal(march.carryover, 0);
  assert.equal(march.monthlyContribution, 20000);
  assert.equal(march.monthlyAdjustment, 0);
  assert.equal(march.balance, 20000);
});

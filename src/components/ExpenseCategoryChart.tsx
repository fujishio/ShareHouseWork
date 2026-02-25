"use client";

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { EXPENSE_CATEGORY_COLORS } from "@/domain/expenses/expense-categories";
import type { ExpenseCategory, ExpenseRecord } from "@/types";

type Props = {
  expenses: ExpenseRecord[];
};

export default function ExpenseCategoryChart({ expenses }: Props) {
  const activeExpenses = expenses.filter((e) => !e.canceledAt);

  const totals = activeExpenses.reduce<Partial<Record<ExpenseCategory, number>>>(
    (acc, expense) => {
      acc[expense.category] = (acc[expense.category] ?? 0) + expense.amount;
      return acc;
    },
    {}
  );

  const data = (Object.entries(totals) as [ExpenseCategory, number][])
    .filter(([, amount]) => amount > 0)
    .map(([category, amount]) => ({ name: category, value: amount }));

  if (data.length === 0) {
    return (
      <div className="flex h-32 items-center justify-center text-sm text-stone-400">
        支出記録がありません
      </div>
    );
  }

  return (
    <div>
      <ResponsiveContainer width="100%" height={160}>
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            cx="50%"
            cy="50%"
            outerRadius={60}
            innerRadius={32}
          >
            {data.map((entry) => (
              <Cell
                key={entry.name}
                fill={EXPENSE_CATEGORY_COLORS[entry.name as ExpenseCategory] ?? "#94a3b8"}
              />
            ))}
          </Pie>
          <Tooltip
            formatter={(value: number) => `¥${value.toLocaleString()}`}
          />
        </PieChart>
      </ResponsiveContainer>
      <ul className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1">
        {data.map((entry) => (
          <li key={entry.name} className="flex items-center gap-1.5 text-xs text-stone-600">
            <span
              className="inline-block h-2.5 w-2.5 shrink-0 rounded-full"
              style={{
                backgroundColor:
                  EXPENSE_CATEGORY_COLORS[entry.name as ExpenseCategory] ?? "#94a3b8",
              }}
            />
            <span className="truncate">{entry.name}</span>
            <span className="ml-auto shrink-0 font-medium">
              ¥{entry.value.toLocaleString()}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

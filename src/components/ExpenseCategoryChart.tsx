"use client";

import { useMemo } from "react";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { EXPENSE_CATEGORIES, EXPENSE_CATEGORY_COLORS } from "@/domain/expenses/expense-categories";
import type { ExpenseCategory, ExpenseRecord } from "@/types";

type Props = {
  expenses: ExpenseRecord[];
};

export default function ExpenseCategoryChart({ expenses }: Props) {
  const data = useMemo(() => {
    const totals = expenses.reduce<Record<ExpenseCategory, number>>(
      (acc, expense) => {
        if (!expense.canceledAt) {
          acc[expense.category] += expense.amount;
        }
        return acc;
      },
      {
        "水道・光熱費": 0,
        食費: 0,
        消耗品: 0,
        日用品: 0,
        その他: 0,
      },
    );

    return EXPENSE_CATEGORIES.map((category) => ({
      name: category,
      value: totals[category],
    })).filter((entry) => entry.value > 0);
  }, [expenses]);

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
              <Cell key={entry.name} fill={EXPENSE_CATEGORY_COLORS[entry.name] ?? "#94a3b8"} />
            ))}
          </Pie>
          <Tooltip formatter={(value: number) => `¥${value.toLocaleString()}`} />
        </PieChart>
      </ResponsiveContainer>
      <ul className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1">
        {data.map((entry) => (
          <li key={entry.name} className="flex items-center gap-1.5 text-xs text-stone-600">
            <span
              className="inline-block h-2.5 w-2.5 shrink-0 rounded-full"
              style={{
                backgroundColor: EXPENSE_CATEGORY_COLORS[entry.name] ?? "#94a3b8",
              }}
            />
            <span className="truncate">{entry.name}</span>
            <span className="ml-auto shrink-0 font-medium">¥{entry.value.toLocaleString()}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

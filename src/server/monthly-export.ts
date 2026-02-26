import type { ExpenseRecord, ShoppingItem, TaskCompletionRecord } from "@/types";

type MemberSummary = {
  member: string;
  completions: number;
  totalPoints: number;
  appCompletions: number;
  lineCompletions: number;
  firstCompletedAt: string;
  lastCompletedAt: string;
};

function toCsvCell(value: string | number) {
  const stringValue = String(value);
  if (!/[",\n]/.test(stringValue)) {
    return stringValue;
  }
  return `"${stringValue.replace(/"/g, "\"\"")}"`;
}

function toCsvRow(values: Array<string | number>) {
  return values.map((value) => toCsvCell(value)).join(",");
}

export function buildMonthlyOperationsCsv(
  input: {
    month: string;
    taskCompletions: TaskCompletionRecord[];
    expenses: ExpenseRecord[];
    shoppingItems: ShoppingItem[];
  }
) {
  const { month, taskCompletions, expenses, shoppingItems } = input;
  const monthRegex = /^\d{4}-\d{2}$/;
  if (!monthRegex.test(month)) {
    throw new Error("month must be YYYY-MM format");
  }

  const monthlyTaskCompletions = taskCompletions
    .filter((record) => record.completedAt.startsWith(month))
    .sort((a, b) => a.completedAt.localeCompare(b.completedAt));

  const summaryHeader = toCsvRow([
    "month",
    "member",
    "completions",
    "total_points",
    "app_completions",
    "line_completions",
    "first_completed_at",
    "last_completed_at",
  ]);

  const lines: string[] = [];
  lines.push("# task_member_summary");
  lines.push(summaryHeader);

  if (monthlyTaskCompletions.length === 0) {
    lines.push(toCsvRow([month, "N/A", 0, 0, 0, 0, "", ""]));
  } else {
    const byMember = new Map<string, MemberSummary>();
    for (const record of monthlyTaskCompletions) {
      const existing = byMember.get(record.completedBy);
      if (!existing) {
        byMember.set(record.completedBy, {
          member: record.completedBy,
          completions: 1,
          totalPoints: record.points,
          appCompletions: record.source === "app" ? 1 : 0,
          lineCompletions: record.source === "line" ? 1 : 0,
          firstCompletedAt: record.completedAt,
          lastCompletedAt: record.completedAt,
        });
        continue;
      }

      existing.completions += 1;
      existing.totalPoints += record.points;
      if (record.source === "app") {
        existing.appCompletions += 1;
      } else {
        existing.lineCompletions += 1;
      }
      if (record.completedAt < existing.firstCompletedAt) {
        existing.firstCompletedAt = record.completedAt;
      }
      if (record.completedAt > existing.lastCompletedAt) {
        existing.lastCompletedAt = record.completedAt;
      }
    }

    const memberRows = Array.from(byMember.values())
      .sort((a, b) => b.totalPoints - a.totalPoints || a.member.localeCompare(b.member))
      .map((summary) =>
        toCsvRow([
          month,
          summary.member,
          summary.completions,
          summary.totalPoints,
          summary.appCompletions,
          summary.lineCompletions,
          summary.firstCompletedAt,
          summary.lastCompletedAt,
        ])
      );
    lines.push(...memberRows);

    const totals = monthlyTaskCompletions.reduce(
      (acc, record) => {
        acc.completions += 1;
        acc.totalPoints += record.points;
        if (record.source === "app") {
          acc.appCompletions += 1;
        } else {
          acc.lineCompletions += 1;
        }
        return acc;
      },
      { completions: 0, totalPoints: 0, appCompletions: 0, lineCompletions: 0 }
    );

    lines.push(
      toCsvRow([
        month,
        "TOTAL",
        totals.completions,
        totals.totalPoints,
        totals.appCompletions,
        totals.lineCompletions,
        monthlyTaskCompletions[0].completedAt,
        monthlyTaskCompletions[monthlyTaskCompletions.length - 1].completedAt,
      ])
    );
  }

  const monthlyExpenses = expenses
    .filter((expense) => expense.purchasedAt.startsWith(month))
    .sort((a, b) => a.purchasedAt.localeCompare(b.purchasedAt));

  lines.push("");
  lines.push("# expenses");
  lines.push(
    toCsvRow([
      "month",
      "id",
      "title",
      "amount",
      "category",
      "purchased_by",
      "purchased_at",
      "is_canceled",
      "canceled_by",
      "canceled_at",
      "cancel_reason",
    ])
  );
  if (monthlyExpenses.length === 0) {
    lines.push(toCsvRow([month, "N/A", "", 0, "", "", "", false, "", "", ""]));
  } else {
    lines.push(
      ...monthlyExpenses.map((expense) =>
        toCsvRow([
          month,
          expense.id,
          expense.title,
          expense.amount,
          expense.category,
          expense.purchasedBy,
          expense.purchasedAt,
          Boolean(expense.canceledAt),
          expense.canceledBy ?? "",
          expense.canceledAt ?? "",
          expense.cancelReason ?? "",
        ])
      )
    );
  }

  const monthlyShopping = shoppingItems
    .filter(
      (item) =>
        item.addedAt.startsWith(month) ||
        item.checkedAt?.startsWith(month) ||
        item.canceledAt?.startsWith(month)
    )
    .sort((a, b) => a.addedAt.localeCompare(b.addedAt));

  lines.push("");
  lines.push("# shopping");
  lines.push(
    toCsvRow([
      "month",
      "id",
      "name",
      "quantity",
      "memo",
      "added_by",
      "added_at",
      "status",
      "checked_by",
      "checked_at",
      "canceled_by",
      "canceled_at",
    ])
  );
  if (monthlyShopping.length === 0) {
    lines.push(
      toCsvRow([month, "N/A", "", "", "", "", "", "none", "", "", "", ""])
    );
  } else {
    lines.push(
      ...monthlyShopping.map((item) => {
        const status = item.canceledAt
          ? "canceled"
          : item.checkedAt
            ? "purchased"
            : "pending";
        return toCsvRow([
          month,
          item.id,
          item.name,
          item.quantity,
          item.memo,
          item.addedBy,
          item.addedAt,
          status,
          item.checkedBy ?? "",
          item.checkedAt ?? "",
          item.canceledBy ?? "",
          item.canceledAt ?? "",
        ]);
      })
    );
  }

  return `${lines.join("\n")}\n`;
}

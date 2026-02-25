import type { TaskCompletionRecord } from "@/types";

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
  records: TaskCompletionRecord[],
  month: string
) {
  const monthRegex = /^\d{4}-\d{2}$/;
  if (!monthRegex.test(month)) {
    throw new Error("month must be YYYY-MM format");
  }

  const monthlyRecords = records
    .filter((record) => record.completedAt.startsWith(month))
    .sort((a, b) => a.completedAt.localeCompare(b.completedAt));

  const header = toCsvRow([
    "month",
    "member",
    "completions",
    "total_points",
    "app_completions",
    "line_completions",
    "first_completed_at",
    "last_completed_at",
  ]);

  if (monthlyRecords.length === 0) {
    return `${header}\n${toCsvRow([month, "N/A", 0, 0, 0, 0, "", ""])}\n`;
  }

  const byMember = new Map<string, MemberSummary>();
  for (const record of monthlyRecords) {
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

  const totals = monthlyRecords.reduce(
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

  const totalRow = toCsvRow([
    month,
    "TOTAL",
    totals.completions,
    totals.totalPoints,
    totals.appCompletions,
    totals.lineCompletions,
    monthlyRecords[0].completedAt,
    monthlyRecords[monthlyRecords.length - 1].completedAt,
  ]);

  return `${header}\n${memberRows.join("\n")}\n${totalRow}\n`;
}

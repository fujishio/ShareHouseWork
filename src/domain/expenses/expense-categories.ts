import type { ExpenseCategory } from "@/types";

export const EXPENSE_CATEGORIES = [
  "水道・光熱費",
  "食費",
  "消耗品",
  "日用品",
  "その他",
] as const satisfies readonly ExpenseCategory[];

export const DEFAULT_EXPENSE_CATEGORY: ExpenseCategory = "消耗品";

export function isExpenseCategory(value: string): value is ExpenseCategory {
  return EXPENSE_CATEGORIES.some((category) => category === value);
}

export const EXPENSE_CATEGORY_COLORS: Record<ExpenseCategory, string> = {
  "水道・光熱費": "#60a5fa", // blue-400
  "食費": "#34d399",         // emerald-400
  "消耗品": "#fbbf24",       // amber-400
  "日用品": "#a78bfa",       // violet-400
  "その他": "#94a3b8",       // slate-400
};

import type { IsoDateString, IsoDateTimeString, MoneyYen } from "./primitives";

export type ExpenseSummary = {
  month: string;
  totalContributed: MoneyYen;
  totalSpent: MoneyYen;
  balance: MoneyYen;
};

export type ExpenseCategory =
  | "水道・光熱費"
  | "食費"
  | "消耗品"
  | "日用品"
  | "その他";

export type ExpenseRecord = {
  id: string;
  houseId: string;
  title: string;
  amount: MoneyYen;
  category: ExpenseCategory;
  purchasedBy: string;
  purchasedAt: IsoDateString;
  canceledAt?: IsoDateTimeString;
  canceledBy?: string;
  cancelReason?: string;
};

export type CreateExpenseInput = {
  houseId: string;
  title: string;
  amount: MoneyYen;
  category: ExpenseCategory;
  purchasedBy: string;
  purchasedAt: IsoDateString;
};

export type CancelExpenseInput = {
  canceledBy: string;
  cancelReason: string;
};

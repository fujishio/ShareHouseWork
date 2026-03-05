import type { IsoDateString, MoneyYen } from "./primitives";

export type BalanceAdjustmentRecord = {
  id: string;
  houseId: string;
  amount: MoneyYen;
  reason: string;
  adjustedBy: string;
  adjustedAt: IsoDateString;
};

export type CreateBalanceAdjustmentInput = {
  houseId: string;
  amount: MoneyYen;
  reason: string;
  adjustedBy: string;
  adjustedAt: IsoDateString;
};

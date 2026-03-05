import type { MoneyYen, YearMonthString } from "./primitives";

export type ContributionSettings = {
  monthlyAmountPerPerson: MoneyYen;
  memberCount: number;
};

export type ContributionSettingsHistoryRecord = ContributionSettings & {
  houseId: string;
  effectiveMonth: YearMonthString;
};

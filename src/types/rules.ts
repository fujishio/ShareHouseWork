import type { IsoDateTimeString } from "./primitives";

export type RuleCategory =
  | "ゴミ捨て"
  | "騒音"
  | "共用部"
  | "来客"
  | "その他";

export type Rule = {
  id: string;
  houseId: string;
  title: string;
  body: string;
  category: RuleCategory;
  createdBy: string;
  createdAt: IsoDateTimeString;
  updatedAt?: IsoDateTimeString;
  acknowledgedBy?: string[];
  deletedAt?: IsoDateTimeString;
  deletedBy?: string;
};

export type CreateRuleInput = {
  houseId: string;
  title: string;
  body: string;
  category: RuleCategory;
  createdBy: string;
  createdAt: IsoDateTimeString;
};

export type UpdateRuleInput = {
  title: string;
  body: string;
  category: RuleCategory;
  updatedAt: IsoDateTimeString;
};

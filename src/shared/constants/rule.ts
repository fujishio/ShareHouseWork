import type { RuleCategory } from "../../types/index.ts";

export const RULE_CATEGORIES = [
  "ゴミ捨て",
  "騒音",
  "共用部",
  "来客",
  "その他",
] as const satisfies readonly RuleCategory[];

export function isRuleCategory(value: string): value is RuleCategory {
  return RULE_CATEGORIES.some((category) => category === value);
}

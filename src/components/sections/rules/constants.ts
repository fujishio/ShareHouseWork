import type { RuleCategory } from "@/types";
import { RULE_CATEGORIES } from "@/shared/constants/rule";

export const CATEGORY_ORDER: RuleCategory[] = [...RULE_CATEGORIES];

export const CATEGORY_EMOJI: Record<RuleCategory, string> = {
  "ゴミ捨て": "🗑",
  "騒音": "🔇",
  "共用部": "🏠",
  "来客": "🚪",
  "その他": "📋",
};

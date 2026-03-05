export const dynamic = "force-dynamic";

import { readRules } from "@/server/rule-store";
import RulesSection from "@/components/RulesSection";
import { resolveRequestHouseId } from "@/server/request-house";

export default async function RulesPage() {
  const houseId = await resolveRequestHouseId() ?? "";
  const rules = await readRules(houseId);
  const active = rules.filter((r) => !r.deletedAt);

  return (
    <div className="space-y-4">
      <RulesSection initialRules={active} />
    </div>
  );
}

import { readRules } from "@/server/rule-store";
import RulesSection from "@/components/RulesSection";

export default async function RulesPage() {
  const rules = await readRules();
  const active = rules.filter((r) => !r.deletedAt);

  return (
    <div className="space-y-4">
      <RulesSection initialRules={active} />
    </div>
  );
}

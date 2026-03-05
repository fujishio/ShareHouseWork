export const dynamic = "force-dynamic";

import { readRules } from "@/server/rule-store";
import RulesSection from "@/components/RulesSection";
import { resolveRequestHouseId } from "@/server/request-house";

export default async function RulesPage() {
  const houseId = await resolveRequestHouseId();
  if (!houseId) {
    return (
      <div className="space-y-4">
        <section className="rounded-2xl border border-stone-200/60 bg-white p-4 shadow-sm">
          <h3 className="font-bold text-stone-800">ハウスルール</h3>
          <p className="mt-2 text-sm text-stone-500">ハウスに参加するとルールが表示されます。</p>
        </section>
      </div>
    );
  }
  const rules = await readRules(houseId);
  const active = rules.filter((r) => !r.deletedAt);

  return (
    <div className="space-y-4">
      <RulesSection initialRules={active} />
    </div>
  );
}

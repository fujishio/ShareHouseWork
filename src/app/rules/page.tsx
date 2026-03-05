export const dynamic = "force-dynamic";

import { readRules } from "@/server/rule-store";
import RulesSection from "@/components/RulesSection";
import { resolveRequestHouseId } from "@/server/request-house";
import { getHouse } from "@/server/house-store";
import { listUsers } from "@/server/user-store";

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
  const house = await getHouse(houseId);
  const [rules, members] = await Promise.all([
    readRules(houseId),
    house?.memberUids.length ? listUsers(house.memberUids) : Promise.resolve([]),
  ]);
  const active = rules.filter((r) => !r.deletedAt);
  return (
    <div className="space-y-4">
      <RulesSection initialRules={active} participantMembers={members} />
    </div>
  );
}

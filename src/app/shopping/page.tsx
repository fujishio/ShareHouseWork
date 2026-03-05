export const dynamic = "force-dynamic";

import { readShoppingItems } from "@/server/shopping-store";
import ShoppingSection from "@/components/ShoppingSection";
import { toJstMonthKey } from "@/shared/lib/time";
import { resolveRequestHouseId } from "@/server/request-house";

export default async function ShoppingPage() {
  const now = new Date();
  const currentMonth = toJstMonthKey(now);
  const houseId = await resolveRequestHouseId();
  if (!houseId) {
    return (
      <div className="space-y-4">
        <section className="rounded-2xl border border-stone-200/60 bg-white p-4 shadow-sm">
          <h3 className="font-bold text-stone-800">買い物リスト</h3>
          <p className="mt-2 text-sm text-stone-500">ハウスに参加すると買い物リストが表示されます。</p>
        </section>
      </div>
    );
  }
  const items = await readShoppingItems(houseId);

  return (
    <div className="space-y-4">
      <ShoppingSection initialItems={items} currentMonth={currentMonth} />
    </div>
  );
}

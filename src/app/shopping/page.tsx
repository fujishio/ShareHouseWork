export const dynamic = "force-dynamic";

import { readShoppingItems } from "@/server/shopping-store";
import ShoppingSection from "@/components/ShoppingSection";
import { toJstMonthKey } from "@/shared/lib/time";
import { resolveRequestHouseId } from "@/server/request-house";

export default async function ShoppingPage() {
  const now = new Date();
  const currentMonth = toJstMonthKey(now);
  const houseId = await resolveRequestHouseId() ?? "";
  const items = await readShoppingItems(houseId);

  return (
    <div className="space-y-4">
      <ShoppingSection initialItems={items} currentMonth={currentMonth} />
    </div>
  );
}

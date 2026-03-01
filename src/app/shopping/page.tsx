import { readShoppingItems } from "@/server/shopping-store";
import ShoppingSection from "@/components/ShoppingSection";
import { toJstMonthKey } from "@/shared/lib/time";

export default async function ShoppingPage() {
  const now = new Date();
  const currentMonth = toJstMonthKey(now);
  const items = await readShoppingItems();

  return (
    <div className="space-y-4">
      <ShoppingSection initialItems={items} currentMonth={currentMonth} />
    </div>
  );
}

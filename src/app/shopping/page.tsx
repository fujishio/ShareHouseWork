import { readShoppingItems } from "@/server/shopping-store";
import ShoppingSection from "@/components/ShoppingSection";

const JST_TIMEZONE = "Asia/Tokyo";

function getJstMonthKey(date: Date): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: JST_TIMEZONE,
    year: "numeric",
    month: "2-digit",
  }).formatToParts(date);
  const year = parts.find((p) => p.type === "year")?.value ?? "";
  const month = parts.find((p) => p.type === "month")?.value ?? "";
  return `${year}-${month}`;
}

export default async function ShoppingPage() {
  const now = new Date();
  const currentMonth = getJstMonthKey(now);
  const items = await readShoppingItems();

  return (
    <div className="space-y-4">
      <ShoppingSection initialItems={items} currentMonth={currentMonth} />
    </div>
  );
}

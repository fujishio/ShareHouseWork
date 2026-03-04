export const dynamic = "force-dynamic";

import { readNotices } from "@/server/notice-store";
import NoticesSection from "@/components/NoticesSection";
import { getFirstHouseId } from "@/server/house-store";

export default async function NoticesPage() {
  const houseId = await getFirstHouseId() ?? "";
  const notices = await readNotices(houseId);
  const active = notices.filter((n) => !n.deletedAt);

  return (
    <div className="space-y-4">
      <NoticesSection initialNotices={active} />
    </div>
  );
}

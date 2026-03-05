export const dynamic = "force-dynamic";

import { readNotices } from "@/server/notice-store";
import NoticesSection from "@/components/NoticesSection";
import { resolveRequestHouseId } from "@/server/request-house";

export default async function NoticesPage() {
  const houseId = await resolveRequestHouseId() ?? "";
  const notices = await readNotices(houseId);
  const active = notices.filter((n) => !n.deletedAt);

  return (
    <div className="space-y-4">
      <NoticesSection initialNotices={active} />
    </div>
  );
}

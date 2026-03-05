export const dynamic = "force-dynamic";

import { readNotices } from "@/server/notice-store";
import NoticesSection from "@/components/NoticesSection";
import { resolveRequestHouseId } from "@/server/request-house";

export default async function NoticesPage() {
  const houseId = await resolveRequestHouseId();
  if (!houseId) {
    return (
      <div className="space-y-4">
        <section className="rounded-2xl border border-stone-200/60 bg-white p-4 shadow-sm">
          <h3 className="font-bold text-stone-800">お知らせ</h3>
          <p className="mt-2 text-sm text-stone-500">ハウスに参加するとお知らせが表示されます。</p>
        </section>
      </div>
    );
  }
  const notices = await readNotices(houseId);
  const active = notices.filter((n) => !n.deletedAt);

  return (
    <div className="space-y-4">
      <NoticesSection initialNotices={active} />
    </div>
  );
}

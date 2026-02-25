import { readNotices } from "@/server/notice-store";
import NoticesSection from "@/components/NoticesSection";

export default async function NoticesPage() {
  const notices = await readNotices();
  const active = notices.filter((n) => !n.deletedAt);

  return (
    <div className="space-y-4">
      <NoticesSection initialNotices={active} />
    </div>
  );
}

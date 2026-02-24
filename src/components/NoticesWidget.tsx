import Link from "next/link";
import { Bell } from "lucide-react";
import type { Notice } from "@/types";
import { formatRelativeTime } from "@/lib/format";

type Props = {
  notices: Notice[];
};

export default function NoticesWidget({ notices }: Props) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-bold text-gray-800">お知らせ</h2>
        <Link
          href="/notices"
          className="text-xs text-emerald-600 hover:underline font-medium"
        >
          すべて見る →
        </Link>
      </div>

      {notices.length === 0 ? (
        <p className="text-sm text-gray-400 py-2 text-center">お知らせはありません</p>
      ) : (
        <ul className="space-y-1">
          {notices.map((notice) => (
            <li
              key={notice.id}
              className="flex items-start gap-3 py-2.5 border-b border-gray-50 last:border-0"
            >
              <div className="w-8 h-8 rounded-full bg-amber-50 flex items-center justify-center flex-shrink-0 mt-0.5">
                <Bell size={14} className="text-amber-500" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-gray-700 leading-snug">{notice.title}</p>
                <p className="text-xs text-gray-400 mt-0.5">
                  {notice.postedBy} · {formatRelativeTime(notice.postedAt)}
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

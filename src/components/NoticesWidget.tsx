"use client";

import Link from "next/link";
import { Bell } from "lucide-react";
import type { Notice } from "@/types";
import { formatRelativeTime } from "@/shared/lib/time";

type Props = {
  notices: Notice[];
};

export default function NoticesWidget({ notices }: Props) {
  const filteredNotices = notices;

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-stone-200/60 p-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-bold text-stone-800">お知らせ</h2>
        <div className="flex items-center gap-2">
          <Link
            href="/settings"
            className="text-xs text-stone-500 hover:underline font-medium"
          >
            通知設定
          </Link>
          <Link
            href="/notices"
            className="text-xs text-amber-600 hover:underline font-medium"
          >
            すべて見る →
          </Link>
        </div>
      </div>

      {filteredNotices.length === 0 ? (
        <p className="text-sm text-stone-400 py-2 text-center">
          お知らせはありません
        </p>
      ) : (
        <ul className="space-y-1">
          {filteredNotices.map((notice) => (
            <li
              key={notice.id}
              className="flex items-start gap-3 py-2.5 border-b border-stone-100/60 last:border-0"
            >
              <div className="w-8 h-8 rounded-full bg-amber-50 flex items-center justify-center flex-shrink-0 mt-0.5">
                <Bell size={14} className="text-amber-500" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-stone-700 leading-snug">{notice.title}</p>
                <p className="text-xs text-stone-400 mt-0.5 flex items-center gap-1.5">
                  {notice.isImportant && (
                    <span className="inline-flex rounded-md bg-red-50 px-1.5 py-0.5 text-[10px] font-semibold text-red-600">
                      重要
                    </span>
                  )}
                  {notice.postedBy} · {formatRelativeTime(new Date(notice.postedAt))}
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

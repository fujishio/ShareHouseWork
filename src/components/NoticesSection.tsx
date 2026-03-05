"use client";

import { Bell, AlertCircle, Trash2, ChevronDown, ChevronUp } from "lucide-react";
import type { Notice } from "@/types";
import { formatRelativeTime } from "@/shared/lib/time";
import { LoadingNotice } from "./RequestStatus";
import { useNoticesSection } from "@/hooks/useNoticesSection";

type Props = {
  initialNotices: Notice[];
};

export default function NoticesSection({ initialNotices }: Props) {
  const {
    deletingId,
    oldExpanded,
    importantNotices,
    regularNotices,
    oldNotices,
    setOldExpanded,
    deleteNotice,
  } = useNoticesSection(initialNotices);

  return (
    <div className="space-y-4">
      {deletingId !== null && <LoadingNotice message="お知らせを更新中..." />}

      {importantNotices.length > 0 && (
        <div className="rounded-2xl border border-red-200/60 bg-red-50/50 shadow-sm">
          <div className="px-4 pt-4 pb-3 border-b border-red-100 flex items-center gap-2">
            <AlertCircle size={16} className="text-red-500" />
            <h2 className="font-bold text-red-700">重要なお知らせ</h2>
            <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-700">
              {importantNotices.length}件
            </span>
          </div>
          <ul className="divide-y divide-red-100/60">
            {importantNotices.map((notice) => (
              <NoticeItem
                key={notice.id}
                notice={notice}
                deletingId={deletingId}
                onDelete={deleteNotice}
                important
              />
            ))}
          </ul>
        </div>
      )}

      <div className="rounded-2xl border border-stone-200/60 bg-white shadow-sm">
        <div className="px-4 pt-4 pb-3 border-b border-stone-100">
          <h2 className="font-bold text-stone-800">お知らせ</h2>
          <p className="mt-0.5 text-xs text-stone-400">
            {regularNotices.length === 0 ? "お知らせはありません" : `${regularNotices.length}件`}
          </p>
        </div>

        {regularNotices.length === 0 ? (
          <p className="py-8 text-center text-sm text-stone-400">お知らせはありません</p>
        ) : (
          <ul className="divide-y divide-stone-100">
            {regularNotices.map((notice) => (
              <NoticeItem
                key={notice.id}
                notice={notice}
                deletingId={deletingId}
                onDelete={deleteNotice}
                important={false}
              />
            ))}
          </ul>
        )}
      </div>

      {oldNotices.length > 0 && (
        <div className="rounded-2xl border border-stone-200/60 bg-white shadow-sm">
          <button
            type="button"
            onClick={() => setOldExpanded((value) => !value)}
            className="w-full flex items-center justify-between px-4 py-3 text-left"
          >
            <span className="text-sm font-medium text-stone-500">過去のお知らせ（{oldNotices.length}件）</span>
            {oldExpanded ? (
              <ChevronUp size={16} className="text-stone-400" />
            ) : (
              <ChevronDown size={16} className="text-stone-400" />
            )}
          </button>
          {oldExpanded && (
            <ul className="divide-y divide-stone-100 border-t border-stone-100">
              {oldNotices.map((notice) => (
                <NoticeItem
                  key={notice.id}
                  notice={notice}
                  deletingId={deletingId}
                  onDelete={deleteNotice}
                  important={notice.isImportant}
                />
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

type NoticeItemProps = {
  notice: Notice;
  deletingId: string | null;
  onDelete: (notice: Notice) => void;
  important: boolean;
};

function NoticeItem({ notice, deletingId, onDelete, important }: NoticeItemProps) {
  const postedAt = new Date(notice.postedAt);

  return (
    <li className="flex items-start gap-3 px-4 py-3">
      <div
        className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${
          important ? "bg-red-100" : "bg-amber-50"
        }`}
      >
        <Bell size={14} className={important ? "text-red-500" : "text-amber-500"} />
      </div>
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-medium leading-snug ${important ? "text-red-700" : "text-stone-800"}`}>
          {notice.title}
        </p>
        {notice.body && <p className="mt-1 text-sm text-stone-600 whitespace-pre-wrap">{notice.body}</p>}
        <p className="text-xs text-stone-400 mt-1">
          {notice.postedBy} · {formatRelativeTime(postedAt)}
        </p>
      </div>
      <button
        type="button"
        aria-label="削除"
        disabled={deletingId === notice.id}
        onClick={() => onDelete(notice)}
        className="flex-shrink-0 rounded-lg p-1.5 text-stone-300 hover:bg-stone-100 hover:text-stone-500 transition-colors disabled:opacity-40"
      >
        <Trash2 size={14} />
      </button>
    </li>
  );
}

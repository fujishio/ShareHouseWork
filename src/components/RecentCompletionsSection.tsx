"use client";

import { formatRelativeTime } from "@/shared/lib/time";
import { ErrorNotice, LoadingNotice } from "./RequestStatus";
import type { TaskCompletionRecord } from "@/types";
import { useRecentCompletionsSection } from "@/hooks/useRecentCompletionsSection";

type Props = {
  initialRecords: TaskCompletionRecord[];
};

export default function RecentCompletionsSection({ initialRecords }: Props) {
  const {
    sortedRecords,
    targetId,
    draft,
    isSubmitting,
    errorMessage,
    openCancelEditor,
    closeCancelEditor,
    setReasonType,
    setReasonText,
    cancelCompletion,
  } = useRecentCompletionsSection(initialRecords);

  return (
    <section className="rounded-2xl border border-stone-200/60 bg-white p-4 shadow-sm">
      <h3 className="font-bold text-stone-800">最近の完了履歴</h3>
      {isSubmitting && (
        <div className="mt-2">
          <LoadingNotice message="取り消しを処理中..." />
        </div>
      )}
      {sortedRecords.length === 0 ? (
        <p className="mt-2 text-sm text-stone-500">完了履歴はまだありません。</p>
      ) : (
        <ul className="mt-3 space-y-2">
          {sortedRecords.map((record) => {
            const completedAt = new Date(record.completedAt);
            const isCanceled = Boolean(record.canceledAt);
            const isEditing = targetId === record.id;

            return (
              <li
                key={record.id}
                className="rounded-lg border border-stone-200/60 bg-stone-50 px-3 py-2"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p
                      className={`truncate text-sm font-medium ${
                        isCanceled ? "text-stone-500 line-through" : "text-stone-800"
                      }`}
                    >
                      {record.taskName}
                    </p>
                    <p className="text-xs text-stone-500">
                      {record.completedBy} ・ {formatRelativeTime(completedAt)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-xs font-semibold ${
                        isCanceled ? "text-stone-400" : "text-amber-700"
                      }`}
                    >
                      +{record.points}pt
                    </span>
                    {!isCanceled && (
                      <button
                        type="button"
                        onClick={() => openCancelEditor(record.id)}
                        className="rounded-md border border-red-200 bg-red-50 px-2 py-1 text-xs font-semibold text-red-600 hover:bg-red-100"
                      >
                        完了を取り消す
                      </button>
                    )}
                  </div>
                </div>

                {isCanceled && (
                  <p className="mt-1 text-xs text-red-600">
                    取り消し: {record.canceledBy} ／ 理由: {record.cancelReason}
                  </p>
                )}

                {isEditing && !isCanceled && (
                  <div className="mt-2 space-y-2 rounded-md border border-red-200 bg-white p-2">
                    <div>
                      <label className="text-xs font-semibold text-stone-600">取り消し理由</label>
                      <fieldset className="mt-1 space-y-1.5">
                        <label className="flex items-center gap-2 text-sm text-stone-700">
                          <input
                            type="radio"
                            name={`cancel-reason-${record.id}`}
                            checked={draft.cancelReasonType === "wrong_entry"}
                            onChange={() => setReasonType("wrong_entry")}
                          />
                          登録間違い
                        </label>
                        <label className="flex items-center gap-2 text-sm text-stone-700">
                          <input
                            type="radio"
                            name={`cancel-reason-${record.id}`}
                            checked={draft.cancelReasonType === "incomplete"}
                            onChange={() => setReasonType("incomplete")}
                          />
                          不十分な完了
                        </label>
                        <label className="flex items-center gap-2 text-sm text-stone-700">
                          <input
                            type="radio"
                            name={`cancel-reason-${record.id}`}
                            checked={draft.cancelReasonType === "other"}
                            onChange={() => setReasonType("other")}
                          />
                          その他
                        </label>
                      </fieldset>
                      {draft.cancelReasonType === "other" && (
                        <textarea
                          value={draft.cancelReasonText}
                          onChange={(event) => setReasonText(event.target.value)}
                          className="mt-2 w-full rounded-md border border-stone-300 px-2 py-1.5 text-sm text-stone-700 focus:outline-none focus:ring-2 focus:ring-amber-300"
                          rows={2}
                          placeholder="取り消し理由を入力"
                        />
                      )}
                    </div>
                    {errorMessage && <ErrorNotice message={errorMessage} />}
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={closeCancelEditor}
                        className="rounded-md border border-stone-300 px-2 py-1 text-xs font-semibold text-stone-600 hover:bg-stone-100"
                      >
                        閉じる
                      </button>
                      <button
                        type="button"
                        onClick={() => void cancelCompletion(record.id)}
                        disabled={isSubmitting}
                        className="rounded-md bg-red-600 px-2 py-1 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-60"
                      >
                        {isSubmitting ? "送信中..." : "取り消す"}
                      </button>
                    </div>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

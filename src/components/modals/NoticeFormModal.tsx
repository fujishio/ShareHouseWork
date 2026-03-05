"use client";

import { ErrorNotice } from "@/components/RequestStatus";
import { useNoticeFormModal } from "@/hooks/useNoticeFormModal";

type Props = {
  onClose: () => void;
};

export default function NoticeFormModal({ onClose }: Props) {
  const {
    title,
    body,
    isImportant,
    submitting,
    errorMessage,
    setTitle,
    setBody,
    setIsImportant,
    submit,
  } = useNoticeFormModal(onClose);

  return (
    <>
      <div className="flex items-center justify-between px-4 pt-3 pb-2 border-b border-stone-100 shrink-0">
        <h2 className="text-sm font-bold text-stone-800">お知らせを投稿</h2>
      </div>

      <form
        onSubmit={(event) => {
          event.preventDefault();
          void submit();
        }}
        className="flex-1 overflow-y-auto px-4 py-3 space-y-3"
      >
        {errorMessage && <ErrorNotice message={errorMessage} />}
        <div>
          <label htmlFor="modal-notice-title" className="mb-1 block text-xs font-medium text-stone-600">
            タイトル
          </label>
          <input
            id="modal-notice-title"
            type="text"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="例: 来週、水道工事があります"
            required
            autoFocus
            className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm text-stone-800 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-amber-300"
          />
        </div>

        <div>
          <label htmlFor="modal-notice-body" className="mb-1 block text-xs font-medium text-stone-600">
            詳細（任意）
          </label>
          <textarea
            id="modal-notice-body"
            value={body}
            onChange={(event) => setBody(event.target.value)}
            placeholder="詳しい内容があれば記入してください"
            rows={3}
            className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm text-stone-800 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-amber-300 resize-none"
          />
        </div>

        <div className="flex justify-end">
          <div className="flex flex-col justify-end">
            <label className="flex items-center gap-2 cursor-pointer select-none rounded-lg border border-stone-300 px-3 py-2">
              <input
                type="checkbox"
                checked={isImportant}
                onChange={(event) => setIsImportant(event.target.checked)}
                className="w-4 h-4 rounded accent-red-500"
              />
              <span className="text-sm text-stone-700">重要</span>
            </label>
          </div>
        </div>

        <button
          type="submit"
          disabled={submitting || !title.trim()}
          className="w-full rounded-xl bg-amber-500 py-2.5 text-sm font-semibold text-white hover:bg-amber-600 transition-colors disabled:opacity-50"
        >
          {submitting ? "投稿中…" : "投稿する"}
        </button>
      </form>
    </>
  );
}

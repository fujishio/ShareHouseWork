"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ErrorNotice } from "@/components/RequestStatus";
import { getApiErrorMessage } from "@/shared/lib/api-error";
import { showToast } from "@/shared/lib/toast";
import { MEMBER_NAMES } from "@/shared/constants/house";

type Props = {
  onClose: () => void;
};

export default function NoticeFormModal({ onClose }: Props) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [postedBy, setPostedBy] = useState<string>(MEMBER_NAMES[0]);
  const [isImportant, setIsImportant] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!title.trim()) return;

    setSubmitting(true);
    setErrorMessage(null);
    try {
      const response = await fetch("/api/notices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          body: body.trim(),
          postedBy,
          postedAt: new Date().toISOString(),
          isImportant,
        }),
      });
      if (!response.ok) {
        const message = await getApiErrorMessage(response, "お知らせ投稿に失敗しました");
        setErrorMessage(message);
        showToast({ level: "error", message });
        return;
      }
      router.refresh();
      showToast({ level: "success", message: "お知らせを投稿しました" });
      onClose();
    } catch {
      const message = "通信エラーが発生しました";
      setErrorMessage(message);
      showToast({ level: "error", message });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-3 pb-2 border-b border-stone-100 shrink-0">
        <h2 className="text-sm font-bold text-stone-800">お知らせを投稿</h2>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
        {errorMessage && <ErrorNotice message={errorMessage} />}
        <div>
          <label htmlFor="modal-notice-title" className="mb-1 block text-xs font-medium text-stone-600">
            タイトル
          </label>
          <input
            id="modal-notice-title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
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
            onChange={(e) => setBody(e.target.value)}
            placeholder="詳しい内容があれば記入してください"
            rows={3}
            className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm text-stone-800 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-amber-300 resize-none"
          />
        </div>

        <div className="flex gap-2">
          <div className="flex-1">
            <label htmlFor="modal-notice-postedby" className="mb-1 block text-xs font-medium text-stone-600">
              投稿者
            </label>
            <select
              id="modal-notice-postedby"
              value={postedBy}
              onChange={(e) => setPostedBy(e.target.value)}
              className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm text-stone-800 focus:outline-none focus:ring-2 focus:ring-amber-300"
            >
              {MEMBER_NAMES.map((member) => (
                <option key={member} value={member}>{member}</option>
              ))}
            </select>
          </div>

          <div className="flex flex-col justify-end">
            <label className="flex items-center gap-2 cursor-pointer select-none rounded-lg border border-stone-300 px-3 py-2">
              <input
                type="checkbox"
                checked={isImportant}
                onChange={(e) => setIsImportant(e.target.checked)}
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

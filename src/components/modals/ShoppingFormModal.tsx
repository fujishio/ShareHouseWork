"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { ShoppingItem } from "@/types";

const MEMBERS = ["家主", "パートナー", "友達１", "友達２"] as const;

function toLocalDateString(date: Date = new Date()): string {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 10);
}

type Props = {
  onClose: () => void;
};

export default function ShoppingFormModal({ onClose }: Props) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [quantity, setQuantity] = useState("");
  const [memo, setMemo] = useState("");
  const [addedBy, setAddedBy] = useState<string>(MEMBERS[0]);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!name.trim()) return;

    setSubmitting(true);
    try {
      const response = await fetch("/api/shopping", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          quantity: quantity.trim() || "1",
          memo: memo.trim(),
          addedBy,
          addedAt: toLocalDateString(),
        }),
      });
      if (!response.ok) return;
      router.refresh();
      onClose();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-3 pb-2 border-b border-stone-100 shrink-0">
        <h2 className="text-sm font-bold text-stone-800">買い物を追加</h2>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
        <div>
          <label htmlFor="modal-shopping-name" className="mb-1 block text-xs font-medium text-stone-600">
            品名
          </label>
          <input
            id="modal-shopping-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="例: トイレットペーパー"
            required
            autoFocus
            className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm text-stone-800 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-amber-300"
          />
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <label htmlFor="modal-shopping-quantity" className="mb-1 block text-xs font-medium text-stone-600">
              数量
            </label>
            <input
              id="modal-shopping-quantity"
              type="text"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              placeholder="例: 2個"
              className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm text-stone-800 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-amber-300"
            />
          </div>

          <div>
            <label htmlFor="modal-shopping-addedby" className="mb-1 block text-xs font-medium text-stone-600">
              追加者
            </label>
            <select
              id="modal-shopping-addedby"
              value={addedBy}
              onChange={(e) => setAddedBy(e.target.value)}
              className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm text-stone-800 focus:outline-none focus:ring-2 focus:ring-amber-300"
            >
              {MEMBERS.map((member) => (
                <option key={member} value={member}>{member}</option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label htmlFor="modal-shopping-memo" className="mb-1 block text-xs font-medium text-stone-600">
            メモ（任意）
          </label>
          <input
            id="modal-shopping-memo"
            type="text"
            value={memo}
            onChange={(e) => setMemo(e.target.value)}
            placeholder="例: ドラッグストアで買う"
            className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm text-stone-800 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-amber-300"
          />
        </div>

        <button
          type="submit"
          disabled={submitting || !name.trim()}
          className="w-full rounded-xl bg-amber-500 py-2.5 text-sm font-semibold text-white hover:bg-amber-600 transition-colors disabled:opacity-50"
        >
          {submitting ? "追加中…" : "リストに追加する"}
        </button>
      </form>
    </>
  );
}

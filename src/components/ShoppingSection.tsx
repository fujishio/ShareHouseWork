"use client";

import { useState } from "react";
import { Check, Trash2, Plus, RotateCcw } from "lucide-react";
import type { ShoppingItem } from "@/types";

const MEMBERS = ["家主", "パートナー", "友達１", "友達２"] as const;
const CURRENT_ACTOR = "あなた";

type Props = {
  initialItems: ShoppingItem[];
  currentMonth: string; // "YYYY-MM"
};

function toLocalDateString(date: Date = new Date()): string {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 10);
}

function formatDate(value: string): string {
  const datePart = value.slice(0, 10);
  const [monthLike, dayLike] = datePart.split("-").slice(1);
  if (!monthLike || !dayLike) {
    return value;
  }
  return `${Number(monthLike)}/${Number(dayLike)}`;
}

export default function ShoppingSection({ initialItems, currentMonth }: Props) {
  const [items, setItems] = useState<ShoppingItem[]>(initialItems);
  const [checkingId, setCheckingId] = useState<number | null>(null);
  const [cancelingId, setCancelingId] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [name, setName] = useState("");
  const [quantity, setQuantity] = useState("");
  const [memo, setMemo] = useState("");
  const [addedBy, setAddedBy] = useState<string>(MEMBERS[0]);

  const activeItems = items.filter((item) => !item.canceledAt && !item.checkedAt);
  const thisMonthCheckedItems = items.filter(
    (item) =>
      !item.canceledAt &&
      item.checkedAt &&
      item.checkedAt.startsWith(currentMonth)
  );

  async function handleCheck(item: ShoppingItem) {
    setCheckingId(item.id);
    try {
      const response = await fetch(`/api/shopping/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ checkedBy: CURRENT_ACTOR }),
      });
      if (!response.ok) return;
      const json = (await response.json()) as { data: ShoppingItem };
      setItems((prev) => prev.map((i) => (i.id === item.id ? json.data : i)));
    } finally {
      setCheckingId(null);
    }
  }

  async function handleUncheck(item: ShoppingItem) {
    setCheckingId(item.id);
    try {
      const response = await fetch(`/api/shopping/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ uncheck: true }),
      });
      if (!response.ok) return;
      const json = (await response.json()) as { data: ShoppingItem };
      setItems((prev) => prev.map((i) => (i.id === item.id ? json.data : i)));
    } finally {
      setCheckingId(null);
    }
  }

  async function handleCancel(item: ShoppingItem) {
    setCancelingId(item.id);
    try {
      const response = await fetch(`/api/shopping/${item.id}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ canceledBy: CURRENT_ACTOR }),
      });
      if (!response.ok) return;
      const json = (await response.json()) as { data: ShoppingItem };
      setItems((prev) => prev.map((i) => (i.id === item.id ? json.data : i)));
    } finally {
      setCancelingId(null);
    }
  }

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
      const json = (await response.json()) as { data: ShoppingItem };
      setItems((prev) => [...prev, json.data]);
      setName("");
      setQuantity("");
      setMemo("");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-4">
      {/* Shopping list */}
      <div className="rounded-2xl border border-stone-200/60 bg-white shadow-sm">
        <div className="px-4 pt-4 pb-3 border-b border-stone-100">
          <h2 className="font-bold text-stone-800">買うものリスト</h2>
          <p className="mt-0.5 text-xs text-stone-400">
            {activeItems.length === 0 ? "買うものはありません" : `${activeItems.length}件`}
          </p>
        </div>

        {activeItems.length === 0 ? (
          <p className="py-8 text-center text-sm text-stone-400">
            リストは空です
          </p>
        ) : (
          <ul className="divide-y divide-stone-100">
            {activeItems.map((item) => (
              <li key={item.id} className="flex items-center gap-3 px-4 py-3">
                <button
                  type="button"
                  aria-label="購入済みにする"
                  disabled={checkingId === item.id}
                  onClick={() => handleCheck(item)}
                  className="flex-shrink-0 w-6 h-6 rounded-full border-2 border-stone-300 flex items-center justify-center hover:border-amber-400 hover:bg-amber-50 transition-colors disabled:opacity-40"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline gap-2">
                    <p className="text-sm font-medium text-stone-800">{item.name}</p>
                    {item.quantity && item.quantity !== "1" && (
                      <span className="text-xs text-stone-400">{item.quantity}</span>
                    )}
                  </div>
                  {item.memo && (
                    <p className="mt-0.5 text-xs text-stone-400">{item.memo}</p>
                  )}
                  <p className="mt-0.5 text-xs text-stone-300">
                    {item.addedBy} · {formatDate(item.addedAt)}
                  </p>
                </div>
                <button
                  type="button"
                  aria-label="削除"
                  disabled={cancelingId === item.id}
                  onClick={() => handleCancel(item)}
                  className="flex-shrink-0 rounded-lg p-1.5 text-stone-300 hover:bg-stone-100 hover:text-stone-500 transition-colors disabled:opacity-40"
                >
                  <Trash2 size={14} />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Add item form */}
      <div className="rounded-2xl border border-stone-200/60 bg-white shadow-sm">
        <div className="px-4 pt-4 pb-3 border-b border-stone-100 flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-amber-500 text-white">
            <Plus size={16} />
          </div>
          <h2 className="font-bold text-stone-800">アイテムを追加</h2>
        </div>

        <form onSubmit={handleSubmit} className="px-4 py-4 space-y-3">
          <div>
            <label htmlFor="shopping-name" className="mb-1 block text-xs font-medium text-stone-600">
              品名
            </label>
            <input
              id="shopping-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="例: トイレットペーパー"
              required
              className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm text-stone-800 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-amber-300"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label htmlFor="shopping-quantity" className="mb-1 block text-xs font-medium text-stone-600">
                数量
              </label>
              <input
                id="shopping-quantity"
                type="text"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                placeholder="例: 2個"
                className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm text-stone-800 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-amber-300"
              />
            </div>

            <div>
              <label htmlFor="shopping-addedby" className="mb-1 block text-xs font-medium text-stone-600">
                追加者
              </label>
              <select
                id="shopping-addedby"
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
            <label htmlFor="shopping-memo" className="mb-1 block text-xs font-medium text-stone-600">
              メモ（任意）
            </label>
            <input
              id="shopping-memo"
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
      </div>

      {/* This month's purchased items */}
      {thisMonthCheckedItems.length > 0 && (
        <div className="rounded-2xl border border-stone-200/60 bg-white shadow-sm">
          <div className="px-4 pt-4 pb-3 border-b border-stone-100 flex items-center gap-2">
            <Check size={16} className="text-emerald-500" />
            <h2 className="font-bold text-stone-800">今月の購入済み</h2>
            <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-700">
              {thisMonthCheckedItems.length}件
            </span>
          </div>

          <ul className="divide-y divide-stone-100">
            {thisMonthCheckedItems.map((item) => (
              <li key={item.id} className="flex items-center gap-3 px-4 py-3">
                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-emerald-400 flex items-center justify-center">
                  <Check size={13} className="text-white" strokeWidth={3} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline gap-2">
                    <p className="text-sm font-medium text-stone-400">{item.name}</p>
                    {item.quantity && item.quantity !== "1" && (
                      <span className="text-xs text-stone-300">{item.quantity}</span>
                    )}
                  </div>
                  <p className="mt-0.5 text-xs text-stone-400">
                    {item.checkedBy} · {item.checkedAt ? formatDate(item.checkedAt) : ""}
                  </p>
                </div>
                <button
                  type="button"
                  aria-label="未購入に戻す"
                  disabled={checkingId === item.id}
                  onClick={() => handleUncheck(item)}
                  className="flex-shrink-0 rounded-lg p-1.5 text-stone-300 hover:bg-stone-100 hover:text-stone-500 transition-colors disabled:opacity-40"
                >
                  <RotateCcw size={14} />
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

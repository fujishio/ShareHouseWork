"use client";

import { useState } from "react";
import { Trash2, Pencil, ChevronDown, ChevronUp, BookOpen, Clock, Check } from "lucide-react";
import type { Rule, RuleCategory } from "@/types";
import { useRouter } from "next/navigation";
import { LoadingNotice } from "./RequestStatus";
import { getApiErrorMessage } from "@/shared/lib/api-error";
import { showToast } from "@/shared/lib/toast";
import { CURRENT_ACTOR, MEMBER_NAMES } from "@/shared/constants/house";

const CATEGORY_ORDER: RuleCategory[] = [
  "ゴミ捨て",
  "騒音",
  "共用部",
  "来客",
  "その他",
];

const CATEGORY_EMOJI: Record<RuleCategory, string> = {
  "ゴミ捨て": "🗑",
  "騒音": "🔇",
  "共用部": "🏠",
  "来客": "🚪",
  "その他": "📋",
};

function isRuleConfirmed(rule: Rule): boolean {
  // acknowledgedBy が未定義 = 確認フローなし（古いルール）→ 確認済み扱い
  // acknowledgedBy が空配列 = 確認フローあり・未確認 → 未確認
  if (!rule.acknowledgedBy) return true;
  if (rule.acknowledgedBy.length === 0) return false;
  const requiredMembers = MEMBER_NAMES.filter((m) => m !== rule.createdBy);
  return requiredMembers.every((m) => rule.acknowledgedBy!.includes(m));
}

type Props = {
  initialRules: Rule[];
};

export default function RulesSection({ initialRules }: Props) {
  const router = useRouter();
  const [rules, setRules] = useState<Rule[]>(initialRules);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [editingRule, setEditingRule] = useState<Rule | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editBody, setEditBody] = useState("");
  const [editCategory, setEditCategory] = useState<RuleCategory>("その他");
  const [saving, setSaving] = useState(false);
  const [acknowledgingId, setAcknowledgingId] = useState<number | null>(null);
  const [collapsedCategories, setCollapsedCategories] = useState<Set<string>>(
    new Set()
  );

  const pendingRules = rules.filter((r) => !isRuleConfirmed(r));
  const confirmedRules = rules.filter((r) => isRuleConfirmed(r));

  const grouped = CATEGORY_ORDER.map((category) => ({
    category,
    rules: confirmedRules.filter((r) => r.category === category),
  })).filter((g) => g.rules.length > 0);

  function toggleCategory(category: string) {
    setCollapsedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(category)) {
        next.delete(category);
      } else {
        next.add(category);
      }
      return next;
    });
  }

  async function handleAcknowledge(rule: Rule, memberName: string) {
    setAcknowledgingId(rule.id);
    try {
      const response = await fetch(`/api/rules/${rule.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ acknowledgedBy: memberName }),
      });
      if (!response.ok) {
        showToast({
          level: "error",
          message: await getApiErrorMessage(response, "確認処理に失敗しました"),
        });
        return;
      }
      const { data } = await response.json();
      setRules((prev) => prev.map((r) => (r.id === rule.id ? data : r)));
      showToast({ level: "success", message: "確認済みに更新しました" });
    } catch {
      showToast({ level: "error", message: "通信エラーが発生しました" });
    } finally {
      setAcknowledgingId(null);
    }
  }

  async function handleDelete(rule: Rule) {
    setDeletingId(rule.id);
    try {
      const response = await fetch(`/api/rules/${rule.id}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ deletedBy: CURRENT_ACTOR }),
      });
      if (!response.ok) {
        showToast({
          level: "error",
          message: await getApiErrorMessage(response, "削除に失敗しました"),
        });
        return;
      }
      setRules((prev) => prev.filter((r) => r.id !== rule.id));
      showToast({ level: "success", message: "ルールを削除しました" });
    } catch {
      showToast({ level: "error", message: "通信エラーが発生しました" });
    } finally {
      setDeletingId(null);
    }
  }

  function startEdit(rule: Rule) {
    setEditingRule(rule);
    setEditTitle(rule.title);
    setEditBody(rule.body);
    setEditCategory(rule.category);
  }

  function cancelEdit() {
    setEditingRule(null);
  }

  async function handleSaveEdit(event: React.FormEvent) {
    event.preventDefault();
    if (!editingRule || !editTitle.trim()) return;

    setSaving(true);
    try {
      const response = await fetch(`/api/rules/${editingRule.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: editTitle.trim(),
          body: editBody.trim(),
          category: editCategory,
        }),
      });
      if (!response.ok) {
        showToast({
          level: "error",
          message: await getApiErrorMessage(response, "保存に失敗しました"),
        });
        return;
      }
      const { data } = await response.json();
      setRules((prev) =>
        prev.map((r) => (r.id === editingRule.id ? data : r))
      );
      setEditingRule(null);
      router.refresh();
      showToast({ level: "success", message: "ルールを更新しました" });
    } catch {
      showToast({ level: "error", message: "通信エラーが発生しました" });
    } finally {
      setSaving(false);
    }
  }

  if (rules.length === 0 && !editingRule) {
    return (
      <div className="rounded-2xl border border-stone-200/60 bg-white shadow-sm">
        <div className="px-4 pt-4 pb-3 border-b border-stone-100">
          <h2 className="font-bold text-stone-800">ハウスルール</h2>
        </div>
        <div className="py-12 text-center">
          <BookOpen size={32} className="mx-auto mb-3 text-stone-300" />
          <p className="text-sm text-stone-400">
            まだルールがありません
          </p>
          <p className="text-xs text-stone-400 mt-1">
            右下の＋ボタンからルールを追加できます
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {(deletingId !== null || acknowledgingId !== null || saving) && (
        <LoadingNotice message="ルールを更新中..." />
      )}

      <div className="px-1">
        <h2 className="font-bold text-stone-800">ハウスルール</h2>
        <p className="mt-0.5 text-xs text-stone-400">
          {rules.length}件のルール
        </p>
      </div>

      {/* Pending rules section */}
      {pendingRules.length > 0 && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50/50 shadow-sm">
          <div className="flex items-center gap-2 px-4 py-3 border-b border-amber-200/60">
            <Clock size={16} className="text-amber-500" />
            <span className="font-semibold text-stone-800 text-sm">
              新しく追加されたルール
            </span>
            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-600">
              {pendingRules.length}
            </span>
          </div>
          <ul className="divide-y divide-amber-100">
            {pendingRules.map((rule) => (
              <PendingRuleItem
                key={rule.id}
                rule={rule}
                acknowledgingId={acknowledgingId}
                onAcknowledge={handleAcknowledge}
              />
            ))}
          </ul>
        </div>
      )}

      {/* Confirmed rules by category */}
      {grouped.map(({ category, rules: categoryRules }) => {
        const isCollapsed = collapsedCategories.has(category);
        return (
          <div
            key={category}
            className="rounded-2xl border border-stone-200/60 bg-white shadow-sm"
          >
            <button
              type="button"
              onClick={() => toggleCategory(category)}
              className="w-full flex items-center justify-between px-4 py-3 text-left"
            >
              <div className="flex items-center gap-2">
                <span className="text-base">{CATEGORY_EMOJI[category]}</span>
                <span className="font-semibold text-stone-800 text-sm">
                  {category}
                </span>
                <span className="rounded-full bg-stone-100 px-2 py-0.5 text-xs font-medium text-stone-500">
                  {categoryRules.length}
                </span>
              </div>
              {isCollapsed ? (
                <ChevronDown size={16} className="text-stone-400" />
              ) : (
                <ChevronUp size={16} className="text-stone-400" />
              )}
            </button>

            {!isCollapsed && (
              <ul className="divide-y divide-stone-100 border-t border-stone-100">
                {categoryRules.map((rule) =>
                  editingRule?.id === rule.id ? (
                    <li key={rule.id} className="px-4 py-3">
                      <form onSubmit={handleSaveEdit} className="space-y-2">
                        <input
                          type="text"
                          value={editTitle}
                          onChange={(e) => setEditTitle(e.target.value)}
                          className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm text-stone-800 focus:outline-none focus:ring-2 focus:ring-amber-300"
                          required
                          autoFocus
                        />
                        <textarea
                          value={editBody}
                          onChange={(e) => setEditBody(e.target.value)}
                          rows={2}
                          className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm text-stone-800 focus:outline-none focus:ring-2 focus:ring-amber-300 resize-none"
                        />
                        <select
                          value={editCategory}
                          onChange={(e) =>
                            setEditCategory(e.target.value as RuleCategory)
                          }
                          className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm text-stone-800 focus:outline-none focus:ring-2 focus:ring-amber-300"
                        >
                          {CATEGORY_ORDER.map((cat) => (
                            <option key={cat} value={cat}>
                              {CATEGORY_EMOJI[cat]} {cat}
                            </option>
                          ))}
                        </select>
                        <div className="flex gap-2">
                          <button
                            type="submit"
                            disabled={saving || !editTitle.trim()}
                            className="flex-1 rounded-lg bg-amber-500 py-2 text-sm font-semibold text-white hover:bg-amber-600 transition-colors disabled:opacity-50"
                          >
                            {saving ? "保存中…" : "保存"}
                          </button>
                          <button
                            type="button"
                            onClick={cancelEdit}
                            className="flex-1 rounded-lg border border-stone-300 py-2 text-sm font-medium text-stone-600 hover:bg-stone-50 transition-colors"
                          >
                            キャンセル
                          </button>
                        </div>
                      </form>
                    </li>
                  ) : (
                    <RuleItem
                      key={rule.id}
                      rule={rule}
                      deletingId={deletingId}
                      onDelete={handleDelete}
                      onEdit={startEdit}
                    />
                  )
                )}
              </ul>
            )}
          </div>
        );
      })}
    </div>
  );
}

type PendingRuleItemProps = {
  rule: Rule;
  acknowledgingId: number | null;
  onAcknowledge: (rule: Rule, memberName: string) => void;
};

function PendingRuleItem({ rule, acknowledgingId, onAcknowledge }: PendingRuleItemProps) {
  const acknowledged = rule.acknowledgedBy ?? [];
  const requiredMembers = MEMBER_NAMES.filter((m) => m !== rule.createdBy);
  const remaining = requiredMembers.filter((m) => !acknowledged.includes(m));

  return (
    <li className="px-4 py-3">
      <div className="flex items-start gap-2">
        <span className="text-sm mt-0.5">{CATEGORY_EMOJI[rule.category]}</span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-stone-800 leading-snug">
            {rule.title}
          </p>
          {rule.body && (
            <p className="mt-1 text-sm text-stone-600 whitespace-pre-wrap">
              {rule.body}
            </p>
          )}
          <p className="text-xs text-stone-400 mt-1">
            {rule.createdBy}が提案
          </p>

          {/* Acknowledgment status */}
          <div className="mt-2 flex flex-wrap gap-1.5">
            {requiredMembers.map((member) => {
              const done = acknowledged.includes(member);
              return (
                <span
                  key={member}
                  className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${
                    done
                      ? "bg-green-100 text-green-700"
                      : "bg-stone-100 text-stone-400"
                  }`}
                >
                  {done && <Check size={10} />}
                  {member}
                </span>
              );
            })}
          </div>

          {/* Acknowledge buttons for remaining members */}
          {remaining.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {remaining.map((member) => (
                <button
                  key={member}
                  type="button"
                  disabled={acknowledgingId === rule.id}
                  onClick={() => onAcknowledge(rule, member)}
                  className="inline-flex items-center gap-1 rounded-full bg-amber-500 px-3 py-1 text-xs font-medium text-white hover:bg-amber-600 transition-colors disabled:opacity-50"
                >
                  <Check size={10} />
                  {member}が既読
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </li>
  );
}

type RuleItemProps = {
  rule: Rule;
  deletingId: number | null;
  onDelete: (rule: Rule) => void;
  onEdit: (rule: Rule) => void;
};

function RuleItem({ rule, deletingId, onDelete, onEdit }: RuleItemProps) {
  return (
    <li className="flex items-start gap-3 px-4 py-3">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-stone-800 leading-snug">
          {rule.title}
        </p>
        {rule.body && (
          <p className="mt-1 text-sm text-stone-600 whitespace-pre-wrap">
            {rule.body}
          </p>
        )}
        <p className="text-xs text-stone-400 mt-1">
          {rule.createdBy}が作成
        </p>
      </div>
      <div className="flex items-center gap-1 flex-shrink-0">
        <button
          type="button"
          aria-label="編集"
          onClick={() => onEdit(rule)}
          className="rounded-lg p-1.5 text-stone-300 hover:bg-stone-100 hover:text-stone-500 transition-colors"
        >
          <Pencil size={14} />
        </button>
        <button
          type="button"
          aria-label="削除"
          disabled={deletingId === rule.id}
          onClick={() => onDelete(rule)}
          className="rounded-lg p-1.5 text-stone-300 hover:bg-stone-100 hover:text-stone-500 transition-colors disabled:opacity-40"
        >
          <Trash2 size={14} />
        </button>
      </div>
    </li>
  );
}

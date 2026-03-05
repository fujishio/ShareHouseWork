"use client";

import { ChevronDown, ChevronUp, BookOpen, Clock } from "lucide-react";
import type { Rule } from "@/types";
import { LoadingNotice } from "./RequestStatus";
import { useRulesSection } from "@/hooks/useRulesSection";
import { CATEGORY_EMOJI } from "@/components/sections/rules/constants";
import { RuleEditForm } from "@/components/sections/rules/RuleEditForm";
import { PendingRuleItem } from "@/components/sections/rules/PendingRuleItem";
import { RuleItem } from "@/components/sections/rules/RuleItem";

type Props = { initialRules: Rule[] };

export default function RulesSection({ initialRules }: Props) {
  const {
    rules,
    pendingRules,
    groupedRules,
    deletingId,
    editingRule,
    editTitle,
    editBody,
    editCategory,
    saving,
    acknowledgingId,
    isCategoryCollapsed,
    setEditTitle,
    setEditBody,
    setEditCategory,
    toggleCategory,
    acknowledgeRule,
    deleteRule,
    startEdit,
    cancelEdit,
    saveEdit,
  } = useRulesSection(initialRules);

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
                onAcknowledge={acknowledgeRule}
              />
            ))}
          </ul>
        </div>
      )}

      {groupedRules.map(({ category, rules: categoryRules }) => {
        const isCollapsed = isCategoryCollapsed(category);
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
                      <RuleEditForm
                        title={editTitle}
                        body={editBody}
                        category={editCategory}
                        saving={saving}
                        onTitleChange={setEditTitle}
                        onBodyChange={setEditBody}
                        onCategoryChange={setEditCategory}
                        onCancel={cancelEdit}
                        onSubmit={saveEdit}
                      />
                    </li>
                  ) : (
                    <RuleItem
                      key={rule.id}
                      rule={rule}
                      deletingId={deletingId}
                      onDelete={deleteRule}
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

import { useCallback, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { Rule, RuleCategory } from "@/types";
import { MEMBER_NAMES } from "@/shared/constants/house";
import { apiFetch, readJson } from "@/shared/lib/fetch-client";
import { isDataObjectResponse } from "@/shared/lib/response-guards";
import { submitApiAction } from "@/shared/lib/submit-api-action";
import { CATEGORY_ORDER } from "@/components/sections/rules/constants";

function isRuleConfirmed(rule: Rule): boolean {
  if (!rule.acknowledgedBy) return true;
  if (rule.acknowledgedBy.length === 0) return false;
  const requiredMembers = MEMBER_NAMES.filter((member) => member !== rule.createdBy);
  return requiredMembers.every((member) => rule.acknowledgedBy!.includes(member));
}

export function useRulesSection(initialRules: Rule[]) {
  const router = useRouter();
  const [rules, setRules] = useState<Rule[]>(initialRules);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [editingRule, setEditingRule] = useState<Rule | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editBody, setEditBody] = useState("");
  const [editCategory, setEditCategory] = useState<RuleCategory>("その他");
  const [saving, setSaving] = useState(false);
  const [acknowledgingId, setAcknowledgingId] = useState<string | null>(null);
  const [collapsedCategories, setCollapsedCategories] = useState<Set<RuleCategory>>(new Set());

  const pendingRules = useMemo(
    () => rules.filter((rule) => !isRuleConfirmed(rule)),
    [rules]
  );

  const groupedRules = useMemo(() => {
    const confirmedRules = rules.filter((rule) => isRuleConfirmed(rule));
    return CATEGORY_ORDER.map((category) => ({
      category,
      rules: confirmedRules.filter((rule) => rule.category === category),
    })).filter((entry) => entry.rules.length > 0);
  }, [rules]);

  const isCategoryCollapsed = useCallback((category: RuleCategory) => {
    return collapsedCategories.has(category);
  }, [collapsedCategories]);

  const toggleCategory = useCallback((category: RuleCategory) => {
    setCollapsedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(category)) {
        next.delete(category);
      } else {
        next.add(category);
      }
      return next;
    });
  }, []);

  const acknowledgeRule = useCallback(async (rule: Rule, memberName: string) => {
    setAcknowledgingId(rule.id);
    try {
      await submitApiAction({
        request: () =>
          apiFetch(`/api/rules/${rule.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ acknowledgedBy: memberName }),
          }),
        successMessage: "確認済みに更新しました",
        fallbackErrorMessage: "確認処理に失敗しました",
        onSuccess: async (response) => {
          const { data } = await readJson<{ data: Rule }>(
            response,
            isDataObjectResponse<Rule>
          );
          setRules((prev) => prev.map((entry) => (entry.id === rule.id ? data : entry)));
        },
      });
    } finally {
      setAcknowledgingId(null);
    }
  }, []);

  const deleteRule = useCallback(async (rule: Rule) => {
    setDeletingId(rule.id);
    try {
      await submitApiAction({
        request: () =>
          apiFetch(`/api/rules/${rule.id}`, {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
          }),
        successMessage: "ルールを削除しました",
        fallbackErrorMessage: "削除に失敗しました",
        onSuccess: () => {
          setRules((prev) => prev.filter((entry) => entry.id !== rule.id));
        },
      });
    } finally {
      setDeletingId(null);
    }
  }, []);

  const startEdit = useCallback((rule: Rule) => {
    setEditingRule(rule);
    setEditTitle(rule.title);
    setEditBody(rule.body);
    setEditCategory(rule.category);
  }, []);

  const cancelEdit = useCallback(() => {
    setEditingRule(null);
  }, []);

  const saveEdit = useCallback(async () => {
    if (!editingRule || !editTitle.trim()) return;

    setSaving(true);
    try {
      await submitApiAction({
        request: () =>
          apiFetch(`/api/rules/${editingRule.id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              title: editTitle.trim(),
              body: editBody.trim(),
              category: editCategory,
            }),
          }),
        successMessage: "ルールを更新しました",
        fallbackErrorMessage: "保存に失敗しました",
        onSuccess: async (response) => {
          const { data } = await readJson<{ data: Rule }>(
            response,
            isDataObjectResponse<Rule>
          );
          setRules((prev) => prev.map((entry) => (entry.id === editingRule.id ? data : entry)));
          setEditingRule(null);
          router.refresh();
        },
      });
    } finally {
      setSaving(false);
    }
  }, [editBody, editCategory, editTitle, editingRule, router]);

  return {
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
  };
}

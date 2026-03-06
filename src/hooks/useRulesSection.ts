import { useCallback, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { Rule, RuleCategory } from "@/types";
import { apiFetch, readJson } from "@/shared/lib/fetch-client";
import { isDataObjectResponse } from "@/shared/lib/response-guards";
import { submitApiAction } from "@/shared/lib/submit-api-action";
import { CATEGORY_ORDER } from "@/components/sections/rules/constants";
import { useItemAction } from "@/hooks/useItemAction";
import { useFormSubmit } from "@/hooks/useFormSubmit";

function isRuleConfirmed(rule: Rule, participantNames: string[]): boolean {
  if (!rule.acknowledgedBy) return true;
  if (rule.acknowledgedBy.length === 0) return false;
  const requiredMembers = participantNames.filter((member) => member !== rule.createdBy);
  return requiredMembers.every((member) => rule.acknowledgedBy!.includes(member));
}

export function useRulesSection(initialRules: Rule[], participantNames: string[]) {
  const router = useRouter();
  const [rules, setRules] = useState<Rule[]>(initialRules);
  const deleting = useItemAction();
  const acknowledging = useItemAction();
  const { submitting: saving, handleSubmit } = useFormSubmit();
  const [editingRule, setEditingRule] = useState<Rule | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editBody, setEditBody] = useState("");
  const [editCategory, setEditCategory] = useState<RuleCategory>("その他");
  const [collapsedCategories, setCollapsedCategories] = useState<Set<RuleCategory>>(new Set());

  const pendingRules = useMemo(
    () => rules.filter((rule) => !isRuleConfirmed(rule, participantNames)),
    [participantNames, rules]
  );

  const groupedRules = useMemo(() => {
    const confirmedRules = rules.filter((rule) => isRuleConfirmed(rule, participantNames));
    return CATEGORY_ORDER.map((category) => ({
      category,
      rules: confirmedRules.filter((rule) => rule.category === category),
    })).filter((entry) => entry.rules.length > 0);
  }, [participantNames, rules]);

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

  const acknowledgeRule = useCallback(async (rule: Rule) => {
    await acknowledging.execute(rule.id, async () => {
      await submitApiAction({
        request: () =>
          apiFetch(`/api/rules/${rule.id}`, {
            method: "PATCH",
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
    });
  }, [acknowledging]);

  const deleteRule = useCallback(async (rule: Rule) => {
    await deleting.execute(rule.id, async () => {
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
    });
  }, [deleting]);

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

    await handleSubmit({
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
  }, [editBody, editCategory, editTitle, editingRule, handleSubmit, router]);

  return {
    rules,
    pendingRules,
    groupedRules,
    deletingId: deleting.activeId,
    editingRule,
    editTitle,
    editBody,
    editCategory,
    saving,
    acknowledgingId: acknowledging.activeId,
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

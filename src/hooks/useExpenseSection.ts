import { useCallback, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { BalanceAdjustmentRecord, ExpenseRecord } from "@/types";
import { apiFetch, readJson } from "@/shared/lib/fetch-client";
import { isDataObjectResponse } from "@/shared/lib/response-guards";
import { showToast } from "@/shared/lib/toast";
import { submitApiAction } from "@/shared/lib/submit-api-action";
import { toLocalDateInputValue } from "@/shared/lib/time";
import { useItemAction } from "@/hooks/useItemAction";
import { useExpandableList } from "@/hooks/useExpandableList";

type UseExpenseSectionOptions = {
  initialExpenses: ExpenseRecord[];
  initialBalanceAdjustments: BalanceAdjustmentRecord[];
  currentMonth: string;
  initialCarryover: number;
  initialMonthlyContribution: number;
};

function toMonthPrefix(month: string): string {
  return month.slice(0, 7);
}

export function useExpenseSection({
  initialExpenses,
  initialBalanceAdjustments,
  currentMonth,
  initialCarryover,
  initialMonthlyContribution,
}: UseExpenseSectionOptions) {
  const router = useRouter();
  const [expenses, setExpenses] = useState<ExpenseRecord[]>(initialExpenses);
  const [balanceAdjustments, setBalanceAdjustments] = useState<BalanceAdjustmentRecord[]>(
    initialBalanceAdjustments
  );
  const canceling = useItemAction();
  const [adjustMode, setAdjustMode] = useState<"rewrite" | "amount">("rewrite");
  const [balanceInput, setBalanceInput] = useState("");
  const [adjustReason, setAdjustReason] = useState("");
  const [adjustDate, setAdjustDate] = useState(toLocalDateInputValue);
  const [isAdjusting, setIsAdjusting] = useState(false);

  const monthPrefix = toMonthPrefix(currentMonth);
  const currentMonthExpenses = useMemo(
    () => expenses.filter((entry) => entry.purchasedAt.startsWith(monthPrefix) && !entry.canceledAt),
    [expenses, monthPrefix]
  );
  const monthHistoryExpenses = useMemo(
    () =>
      [...expenses]
        .filter((entry) => entry.purchasedAt.startsWith(monthPrefix))
        .sort((a, b) => new Date(b.purchasedAt).getTime() - new Date(a.purchasedAt).getTime()),
    [expenses, monthPrefix]
  );
  const monthAdjustments = useMemo(
    () =>
      [...balanceAdjustments]
        .filter((entry) => entry.adjustedAt.startsWith(monthPrefix))
        .sort((a, b) => new Date(b.adjustedAt).getTime() - new Date(a.adjustedAt).getTime()),
    [balanceAdjustments, monthPrefix]
  );

  const historyList = useExpandableList(monthHistoryExpenses);
  const adjustmentList = useExpandableList(monthAdjustments);

  const currentMonthSpent = currentMonthExpenses.reduce((sum, entry) => sum + entry.amount, 0);
  const currentMonthAdjustment = monthAdjustments.reduce((sum, entry) => sum + entry.amount, 0);
  const currentBalance =
    initialCarryover + initialMonthlyContribution - currentMonthSpent + currentMonthAdjustment;

  const cancelExpense = useCallback(async (expense: ExpenseRecord) => {
    await canceling.execute(expense.id, async () => {
      await submitApiAction({
        request: () =>
          apiFetch(`/api/expenses/${expense.id}`, {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ cancelReason: "登録間違い" }),
          }),
        successMessage: "支出を取り消しました",
        fallbackErrorMessage: "支出の取消に失敗しました",
        onSuccess: async (response) => {
          const json = await readJson<{ data: ExpenseRecord }>(
            response,
            isDataObjectResponse<ExpenseRecord>
          );
          setExpenses((prev) => prev.map((entry) => (entry.id === expense.id ? json.data : entry)));
        },
      });
    });
  }, [canceling]);

  const submitAdjustment = useCallback(async () => {
    const normalized = balanceInput.replace(/[,\s]/g, "");
    if (!/^-?\d+$/.test(normalized)) {
      showToast({ level: "error", message: "数値で入力してください" });
      return;
    }
    const parsed = Number(normalized);

    let amount: number;
    if (adjustMode === "rewrite") {
      amount = parsed - currentBalance;
      if (amount === 0) {
        showToast({ level: "error", message: "現在残高と同じです" });
        return;
      }
    } else {
      amount = parsed;
      if (amount === 0) {
        showToast({ level: "error", message: "調整額は0以外を入力してください" });
        return;
      }
    }

    setIsAdjusting(true);
    try {
      await submitApiAction({
        request: () =>
          apiFetch("/api/balance-adjustments", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ amount, reason: adjustReason.trim(), adjustedAt: adjustDate }),
          }),
        successMessage: "残高調整を登録しました",
        fallbackErrorMessage: "残高調整の登録に失敗しました",
        onSuccess: async (response) => {
          const json = await readJson<{ data: BalanceAdjustmentRecord }>(
            response,
            isDataObjectResponse<BalanceAdjustmentRecord>
          );
          setBalanceAdjustments((prev) => [json.data, ...prev]);
          setBalanceInput("");
          setAdjustReason("");
          router.refresh();
        },
      });
    } finally {
      setIsAdjusting(false);
    }
  }, [adjustDate, adjustMode, adjustReason, balanceInput, currentBalance, router]);

  return {
    currentMonthExpenses,
    monthHistoryExpenses,
    visibleHistory: historyList.visibleItems,
    monthAdjustments,
    visibleAdjustments: adjustmentList.visibleItems,
    currentBalance,
    cancelingId: canceling.activeId,
    isHistoryExpanded: historyList.isExpanded,
    isAdjustmentHistoryExpanded: adjustmentList.isExpanded,
    adjustMode,
    balanceInput,
    adjustReason,
    adjustDate,
    isAdjusting,
    setIsHistoryExpanded: historyList.setIsExpanded,
    setIsAdjustmentHistoryExpanded: adjustmentList.setIsExpanded,
    setAdjustMode,
    setBalanceInput,
    setAdjustReason,
    setAdjustDate,
    cancelExpense,
    submitAdjustment,
  };
}

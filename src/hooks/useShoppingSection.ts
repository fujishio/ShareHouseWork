import { useCallback, useMemo, useState } from "react";
import type { ExpenseCategory, ShoppingItem } from "@/types";
import {
  DEFAULT_EXPENSE_CATEGORY,
  isExpenseCategory,
} from "@/domain/expenses/expense-categories";
import { apiFetch, readJson } from "@/shared/lib/fetch-client";
import { isDataObjectResponse } from "@/shared/lib/response-guards";
import { submitApiAction } from "@/shared/lib/submit-api-action";
import { showToast } from "@/shared/lib/toast";
import { useItemAction } from "@/hooks/useItemAction";

const RECENT_PURCHASED_MONTHS = 2;

function subtractMonths(monthKey: string, months: number): string {
  const [yearText, monthText] = monthKey.split("-");
  const year = Number(yearText);
  const month = Number(monthText);
  if (!Number.isInteger(year) || !Number.isInteger(month)) {
    return monthKey;
  }
  const date = new Date(Date.UTC(year, month - 1, 1));
  date.setUTCMonth(date.getUTCMonth() - months);
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

function isRecentPurchased(checkedAt: string, currentMonth: string): boolean {
  if (checkedAt.length < 7) {
    return false;
  }
  const checkedMonth = checkedAt.slice(0, 7);
  const thresholdMonth = subtractMonths(currentMonth, RECENT_PURCHASED_MONTHS - 1);
  return checkedMonth >= thresholdMonth;
}

type UseShoppingSectionOptions = {
  initialItems: ShoppingItem[];
  currentMonth: string;
};

export function useShoppingSection({ initialItems, currentMonth }: UseShoppingSectionOptions) {
  const [items, setItems] = useState<ShoppingItem[]>(initialItems);
  const checking = useItemAction();
  const canceling = useItemAction();
  const [showArchivedPurchasedItems, setShowArchivedPurchasedItems] = useState(false);
  const [pendingCheckItem, setPendingCheckItem] = useState<ShoppingItem | null>(null);
  const [pendingAmount, setPendingAmount] = useState("");
  const [pendingCategory, setPendingCategory] = useState<ExpenseCategory>(DEFAULT_EXPENSE_CATEGORY);

  const activeItems = useMemo(
    () => items.filter((item) => !item.canceledAt && !item.checkedAt),
    [items]
  );
  const checkedItems = useMemo(
    () =>
      items
        .filter((item) => !item.canceledAt && item.checkedAt)
        .sort((a, b) => (b.checkedAt ?? "").localeCompare(a.checkedAt ?? "")),
    [items]
  );
  const recentCheckedItems = useMemo(
    () =>
      checkedItems.filter(
        (item) => item.checkedAt && isRecentPurchased(item.checkedAt, currentMonth)
      ),
    [checkedItems, currentMonth]
  );
  const archivedCheckedItems = useMemo(
    () =>
      checkedItems.filter(
        (item) => item.checkedAt && !isRecentPurchased(item.checkedAt, currentMonth)
      ),
    [checkedItems, currentMonth]
  );
  const thisMonthCheckedCount = useMemo(
    () => checkedItems.filter((item) => item.checkedAt?.startsWith(currentMonth)).length,
    [checkedItems, currentMonth]
  );

  const openCheckDialog = useCallback((item: ShoppingItem) => {
    setPendingCheckItem(item);
    setPendingAmount("");
    setPendingCategory(item.category ?? DEFAULT_EXPENSE_CATEGORY);
  }, []);

  const closeCheckDialog = useCallback(() => {
    setPendingCheckItem(null);
  }, []);

  const setPendingCategoryValue = useCallback((value: string) => {
    if (isExpenseCategory(value)) {
      setPendingCategory(value);
    }
  }, []);

  const confirmCheck = useCallback(async (addToExpenses: boolean) => {
    if (!pendingCheckItem) return;
    const item = pendingCheckItem;
    setPendingCheckItem(null);

    await checking.execute(item.id, async () => {
      let checkedAtDate: string | null = null;
      const checked = await submitApiAction({
        request: () =>
          apiFetch(`/api/shopping/${item.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({}),
          }),
        successMessage: addToExpenses ? "購入済みにしました（費用登録を続行中）" : "購入済みにしました",
        fallbackErrorMessage: "購入済み更新に失敗しました",
        onSuccess: async (response) => {
          const json = await readJson<{ data: ShoppingItem }>(
            response,
            isDataObjectResponse<ShoppingItem>
          );
          checkedAtDate = json.data.checkedAt ?? null;
          setItems((prev) => prev.map((entry) => (entry.id === item.id ? json.data : entry)));
        },
      });
      if (!checked || !addToExpenses) return;

      const createdExpense = await submitApiAction({
        request: () =>
          apiFetch("/api/expenses", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              title: item.name,
              amount: Number(pendingAmount),
              category: pendingCategory,
              purchasedAt:
                checkedAtDate?.slice(0, 10) ?? new Date().toISOString().slice(0, 10),
            }),
          }),
        successMessage: "費用に追加して完了しました",
        fallbackErrorMessage: "費用の登録に失敗しました",
      });

      if (!createdExpense) {
        showToast({ level: "success", message: "購入済みへの更新は完了しています" });
      }
    });
    setPendingAmount("");
  }, [checking, pendingAmount, pendingCategory, pendingCheckItem]);

  const uncheckItem = useCallback(async (item: ShoppingItem) => {
    await checking.execute(item.id, async () => {
      await submitApiAction({
        request: () =>
          apiFetch(`/api/shopping/${item.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ uncheck: true }),
          }),
        successMessage: "未購入に戻しました",
        fallbackErrorMessage: "未購入への戻しに失敗しました",
        onSuccess: async (response) => {
          const json = await readJson<{ data: ShoppingItem }>(
            response,
            isDataObjectResponse<ShoppingItem>
          );
          setItems((prev) => prev.map((entry) => (entry.id === item.id ? json.data : entry)));
        },
      });
    });
  }, [checking]);

  const cancelItem = useCallback(async (item: ShoppingItem) => {
    await canceling.execute(item.id, async () => {
      await submitApiAction({
        request: () => apiFetch(`/api/shopping/${item.id}`, { method: "DELETE" }),
        successMessage: "項目を削除しました",
        fallbackErrorMessage: "削除に失敗しました",
        onSuccess: async (response) => {
          const json = await readJson<{ data: ShoppingItem }>(
            response,
            isDataObjectResponse<ShoppingItem>
          );
          setItems((prev) => prev.map((entry) => (entry.id === item.id ? json.data : entry)));
        },
      });
    });
  }, [canceling]);

  return {
    activeItems,
    checkedItems,
    recentCheckedItems,
    archivedCheckedItems,
    thisMonthCheckedCount,
    checkingId: checking.activeId,
    cancelingId: canceling.activeId,
    showArchivedPurchasedItems,
    pendingCheckItem,
    pendingAmount,
    pendingCategory,
    setShowArchivedPurchasedItems,
    setPendingAmount,
    setPendingCategoryValue,
    openCheckDialog,
    closeCheckDialog,
    confirmCheck,
    uncheckItem,
    cancelItem,
  };
}

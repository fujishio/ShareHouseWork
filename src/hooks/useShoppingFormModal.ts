import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import {
  DEFAULT_EXPENSE_CATEGORY,
  isExpenseCategory,
} from "@/domain/expenses/expense-categories";
import type { ExpenseCategory } from "@/types";
import { toLocalDateInputValue } from "@/shared/lib/time";
import { apiFetch } from "@/shared/lib/fetch-client";
import { useFormSubmit } from "@/hooks/useFormSubmit";

export function useShoppingFormModal(onClose: () => void) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [quantity, setQuantity] = useState("");
  const [memo, setMemo] = useState("");
  const [category, setCategory] = useState<ExpenseCategory>(DEFAULT_EXPENSE_CATEGORY);
  const { submitting, errorMessage, handleSubmit } = useFormSubmit();

  const setCategoryValue = useCallback((value: string) => {
    if (isExpenseCategory(value)) {
      setCategory(value);
    }
  }, []);

  const submit = useCallback(async () => {
    if (!name.trim()) return;

    await handleSubmit({
      request: () =>
        apiFetch("/api/shopping", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: name.trim(),
            quantity: quantity.trim() || "1",
            memo: memo.trim(),
            category,
            addedAt: toLocalDateInputValue(),
          }),
        }),
      successMessage: "買い物リストに追加しました",
      fallbackErrorMessage: "買い物の追加に失敗しました",
      onSuccess: () => {
        router.refresh();
        onClose();
      },
    });
  }, [category, handleSubmit, memo, name, onClose, quantity, router]);

  return {
    name,
    quantity,
    memo,
    category,
    submitting,
    errorMessage,
    setName,
    setQuantity,
    setMemo,
    setCategoryValue,
    submit,
  };
}

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import {
  DEFAULT_EXPENSE_CATEGORY,
  isExpenseCategory,
} from "@/domain/expenses/expense-categories";
import type { ExpenseCategory } from "@/types";
import { toLocalDateInputValue } from "@/shared/lib/time";
import { apiFetch } from "@/shared/lib/fetch-client";
import { submitApiAction } from "@/shared/lib/submit-api-action";

export function useExpenseFormModal(onClose: () => void) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState<ExpenseCategory>(DEFAULT_EXPENSE_CATEGORY);
  const [purchasedAt, setPurchasedAt] = useState(toLocalDateInputValue);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const setCategoryValue = useCallback((value: string) => {
    if (isExpenseCategory(value)) {
      setCategory(value);
    }
  }, []);

  const submit = useCallback(async () => {
    const parsedAmount = Number(amount);
    if (!title.trim() || !Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      return;
    }

    setSubmitting(true);
    setErrorMessage(null);
    try {
      await submitApiAction({
        request: () =>
          apiFetch("/api/expenses", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              title: title.trim(),
              amount: parsedAmount,
              category,
              purchasedAt,
            }),
          }),
        successMessage: "支出を登録しました",
        fallbackErrorMessage: "支出の登録に失敗しました",
        onError: (message) => {
          setErrorMessage(message);
        },
        onSuccess: () => {
          router.refresh();
          onClose();
        },
      });
    } finally {
      setSubmitting(false);
    }
  }, [amount, category, onClose, purchasedAt, router, title]);

  return {
    title,
    amount,
    category,
    purchasedAt,
    submitting,
    errorMessage,
    setTitle,
    setAmount,
    setCategoryValue,
    setPurchasedAt,
    submit,
  };
}

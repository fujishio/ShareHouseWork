import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import type { RuleCategory } from "@/types";
import { isRuleCategory } from "@/shared/constants/rule";
import { apiFetch } from "@/shared/lib/fetch-client";
import { useFormSubmit } from "@/hooks/useFormSubmit";

export function useRuleFormModal(onClose: () => void) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [category, setCategory] = useState<RuleCategory>("その他");
  const { submitting, errorMessage, handleSubmit } = useFormSubmit();

  const setCategoryValue = useCallback((value: string) => {
    if (isRuleCategory(value)) {
      setCategory(value);
    }
  }, []);

  const submit = useCallback(async () => {
    if (!title.trim()) return;

    await handleSubmit({
      request: () =>
        apiFetch("/api/rules", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: title.trim(),
            body: body.trim(),
            category,
          }),
        }),
      successMessage: "ルールを追加しました",
      fallbackErrorMessage: "ルール追加に失敗しました",
      onSuccess: () => {
        router.refresh();
        onClose();
      },
    });
  }, [body, category, handleSubmit, onClose, router, title]);

  return {
    title,
    body,
    category,
    submitting,
    errorMessage,
    setTitle,
    setBody,
    setCategoryValue,
    submit,
  };
}

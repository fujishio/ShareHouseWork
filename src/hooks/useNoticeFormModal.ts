import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/shared/lib/fetch-client";
import { useFormSubmit } from "@/hooks/useFormSubmit";

export function useNoticeFormModal(onClose: () => void) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [isImportant, setIsImportant] = useState(false);
  const { submitting, errorMessage, handleSubmit } = useFormSubmit();

  const submit = useCallback(async () => {
    if (!title.trim()) return;

    await handleSubmit({
      request: () =>
        apiFetch("/api/notices", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: title.trim(),
            body: body.trim(),
            isImportant,
          }),
        }),
      successMessage: "お知らせを投稿しました",
      fallbackErrorMessage: "お知らせ投稿に失敗しました",
      onSuccess: () => {
        router.refresh();
        onClose();
      },
    });
  }, [body, handleSubmit, isImportant, onClose, router, title]);

  return {
    title,
    body,
    isImportant,
    submitting,
    errorMessage,
    setTitle,
    setBody,
    setIsImportant,
    submit,
  };
}

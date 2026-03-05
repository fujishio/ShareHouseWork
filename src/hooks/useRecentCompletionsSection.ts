import { useCallback, useEffect, useMemo, useState } from "react";
import type { TaskCompletionRecord } from "@/types";
import { apiFetch, readJson } from "@/shared/lib/fetch-client";
import { isDataObjectResponse } from "@/shared/lib/response-guards";
import { showToast } from "@/shared/lib/toast";
import { submitApiAction } from "@/shared/lib/submit-api-action";

type CancelReasonType = "wrong_entry" | "incomplete" | "other";

type CancelDraft = {
  cancelReasonType: CancelReasonType;
  cancelReasonText: string;
};

const DEFAULT_DRAFT: CancelDraft = {
  cancelReasonType: "wrong_entry",
  cancelReasonText: "",
};

function toCancelReason(draft: CancelDraft): string {
  if (draft.cancelReasonType === "wrong_entry") return "登録間違い";
  if (draft.cancelReasonType === "incomplete") return "不十分な完了";
  return draft.cancelReasonText.trim();
}

export function useRecentCompletionsSection(initialRecords: TaskCompletionRecord[]) {
  const [records, setRecords] = useState(initialRecords);
  const [targetId, setTargetId] = useState<string | null>(null);
  const [draft, setDraft] = useState<CancelDraft>(DEFAULT_DRAFT);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    setRecords(initialRecords);
  }, [initialRecords]);

  const sortedRecords = useMemo(
    () =>
      [...records].sort(
        (a, b) =>
          new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime()
      ),
    [records]
  );

  const openCancelEditor = useCallback((completionId: string) => {
    setTargetId(completionId);
    setDraft(DEFAULT_DRAFT);
    setErrorMessage(null);
  }, []);

  const closeCancelEditor = useCallback(() => {
    setTargetId(null);
    setDraft(DEFAULT_DRAFT);
    setErrorMessage(null);
  }, []);

  const setReasonType = useCallback((reasonType: CancelReasonType) => {
    setDraft((prev) => ({ ...prev, cancelReasonType: reasonType }));
  }, []);

  const setReasonText = useCallback((reasonText: string) => {
    setDraft((prev) => ({ ...prev, cancelReasonText: reasonText }));
  }, []);

  const cancelCompletion = useCallback(async (completionId: string) => {
    if (isSubmitting) return;

    const cancelReason = toCancelReason(draft);
    if (!cancelReason) {
      const message = "取り消し理由は必須です。";
      setErrorMessage(message);
      showToast({ level: "error", message });
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      await submitApiAction({
        request: () =>
          apiFetch(`/api/task-completions/${completionId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ cancelReason }),
          }),
        successMessage: "完了履歴を取り消しました",
        fallbackErrorMessage: "取り消し処理に失敗しました",
        onError: (message) => {
          setErrorMessage(message);
        },
        onSuccess: async (response) => {
          const result = await readJson<{ data: TaskCompletionRecord }>(
            response,
            isDataObjectResponse<TaskCompletionRecord>
          );
          setRecords((prev) =>
            prev.map((record) =>
              record.id === completionId ? result.data : record
            )
          );
          closeCancelEditor();
        },
      });
    } finally {
      setIsSubmitting(false);
    }
  }, [closeCancelEditor, draft, isSubmitting]);

  return {
    sortedRecords,
    targetId,
    draft,
    isSubmitting,
    errorMessage,
    openCancelEditor,
    closeCancelEditor,
    setReasonType,
    setReasonText,
    cancelCompletion,
  };
}

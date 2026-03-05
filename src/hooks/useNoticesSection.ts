import { useCallback, useMemo, useState } from "react";
import type { Notice } from "@/types";
import { apiFetch } from "@/shared/lib/fetch-client";
import { submitApiAction } from "@/shared/lib/submit-api-action";

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

function isOld(postedAt: string): boolean {
  return Date.now() - new Date(postedAt).getTime() > THIRTY_DAYS_MS;
}

export function useNoticesSection(initialNotices: Notice[]) {
  const [notices, setNotices] = useState<Notice[]>(initialNotices);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [oldExpanded, setOldExpanded] = useState(false);

  const recentNotices = useMemo(
    () => notices.filter((notice) => !isOld(notice.postedAt)),
    [notices]
  );
  const oldNotices = useMemo(
    () => notices.filter((notice) => isOld(notice.postedAt)),
    [notices]
  );

  const importantNotices = useMemo(
    () => recentNotices.filter((notice) => notice.isImportant),
    [recentNotices]
  );
  const regularNotices = useMemo(
    () => recentNotices.filter((notice) => !notice.isImportant),
    [recentNotices]
  );

  const deleteNotice = useCallback(async (notice: Notice) => {
    setDeletingId(notice.id);
    try {
      await submitApiAction({
        request: () => apiFetch(`/api/notices/${notice.id}`, { method: "DELETE" }),
        successMessage: "お知らせを削除しました",
        fallbackErrorMessage: "お知らせ削除に失敗しました",
        onSuccess: () => {
          setNotices((prev) => prev.filter((entry) => entry.id !== notice.id));
        },
      });
    } finally {
      setDeletingId(null);
    }
  }, []);

  return {
    deletingId,
    oldExpanded,
    importantNotices,
    regularNotices,
    oldNotices,
    setOldExpanded,
    deleteNotice,
  };
}

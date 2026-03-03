import { useCallback, useEffect, useMemo, useState } from "react";
import { HOUSE_MEMBERS } from "@/shared/constants/house";
import { apiFetch, readJson } from "@/shared/lib/fetch-client";
import { isContributionSettingsResponse } from "@/shared/lib/response-guards";
import { submitApiAction } from "@/shared/lib/submit-api-action";
import type { ContributionSettings } from "@/types";

const DEFAULT_CONTRIBUTION: ContributionSettings = {
  monthlyAmountPerPerson: 15000,
  memberCount: HOUSE_MEMBERS.length,
};

export function useContributionSettings(canEdit: boolean) {
  const [contributionAmount, setContributionAmount] = useState(
    String(DEFAULT_CONTRIBUTION.monthlyAmountPerPerson)
  );
  const [contributionMemberCount, setContributionMemberCount] = useState(
    String(DEFAULT_CONTRIBUTION.memberCount)
  );
  const [contributionSaving, setContributionSaving] = useState(false);
  const [contributionSavedAt, setContributionSavedAt] = useState<Date | null>(null);
  const [contributionError, setContributionError] = useState<string | null>(null);
  const [contributionLoading, setContributionLoading] = useState(false);
  const [contributionLoadError, setContributionLoadError] = useState<string | null>(null);

  const loadContributionSettings = useCallback(async () => {
    setContributionLoading(true);
    setContributionLoadError(null);
    try {
      const response = await apiFetch("/api/settings/contribution");
      if (!response.ok) {
        setContributionLoadError("共益費設定の取得に失敗しました");
        return;
      }

      const json = await readJson<{ data: ContributionSettings }>(
        response,
        isContributionSettingsResponse
      );
      setContributionAmount(String(json.data.monthlyAmountPerPerson));
      setContributionMemberCount(String(json.data.memberCount));
    } catch {
      setContributionLoadError("通信エラーが発生しました");
    } finally {
      setContributionLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadContributionSettings();
  }, [loadContributionSettings]);

  const monthlyTotal = useMemo(() => {
    return Number(contributionAmount) * Number(contributionMemberCount) || 0;
  }, [contributionAmount, contributionMemberCount]);

  const saveContributionSettings = useCallback(async () => {
    if (!canEdit) return;

    const amount = Number(contributionAmount);
    const memberCount = Number(contributionMemberCount);
    if (!Number.isFinite(amount) || amount <= 0) return;
    if (!Number.isInteger(memberCount) || memberCount < 1) return;

    setContributionSaving(true);
    setContributionError(null);
    try {
      await submitApiAction({
        request: () =>
          apiFetch("/api/settings/contribution", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ monthlyAmountPerPerson: amount, memberCount }),
          }),
        successMessage: "共益費設定を保存しました",
        fallbackErrorMessage: "共益費設定の保存に失敗しました",
        onError: (message) => {
          setContributionError(message);
        },
        onSuccess: () => {
          setContributionSavedAt(new Date());
        },
      });
    } finally {
      setContributionSaving(false);
    }
  }, [canEdit, contributionAmount, contributionMemberCount]);

  return {
    contributionAmount,
    setContributionAmount,
    contributionMemberCount,
    setContributionMemberCount,
    contributionSaving,
    contributionSavedAt,
    contributionError,
    contributionLoading,
    contributionLoadError,
    monthlyTotal,
    loadContributionSettings,
    saveContributionSettings,
  };
}

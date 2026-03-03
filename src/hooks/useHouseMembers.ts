import { useCallback, useEffect, useMemo, useState } from "react";
import { apiFetch, readJson } from "@/shared/lib/fetch-client";
import { isDataArrayResponse } from "@/shared/lib/response-guards";
import { submitApiAction } from "@/shared/lib/submit-api-action";
import type { House, HouseListResponse, Member, UserListResponse } from "@/types";

export function useHouseMembers(userUid: string | null | undefined) {
  const [house, setHouse] = useState<House | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const loadData = useCallback(async () => {
    if (!userUid) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setLoadError(null);
    try {
      const [housesResponse, usersResponse] = await Promise.all([apiFetch("/api/houses"), apiFetch("/api/users")]);
      if (!housesResponse.ok) {
        setLoadError("ハウス情報の取得に失敗しました");
        return;
      }
      if (!usersResponse.ok) {
        setLoadError("メンバー情報の取得に失敗しました");
        return;
      }

      const housesJson = await readJson<HouseListResponse>(housesResponse, isDataArrayResponse<House>);
      const usersJson = await readJson<UserListResponse>(usersResponse, isDataArrayResponse<Member>);
      const myHouse = housesJson.data.find((entry) => entry.memberUids.includes(userUid)) ?? null;

      setHouse(myHouse);
      if (!myHouse) {
        setMembers([]);
        return;
      }

      setMembers(usersJson.data.filter((member) => myHouse.memberUids.includes(member.id)));
    } catch {
      setLoadError("通信エラーが発生しました");
    } finally {
      setLoading(false);
    }
  }, [userUid]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const isCurrentUserHost = useMemo(
    () => house?.hostUids.includes(userUid ?? "") ?? false,
    [house, userUid]
  );

  const updateRole = useCallback(async (targetUid: string, action: "grant" | "revoke") => {
    if (!house) return;

    setSaving(true);
    try {
      await submitApiAction({
        request: () =>
          apiFetch(`/api/houses/${house.id}/roles`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ userUid: targetUid, action }),
          }),
        successMessage: action === "grant" ? "ホスト権限を付与しました" : "ホスト権限を解除しました",
        fallbackErrorMessage: "権限の変更に失敗しました",
        onSuccess: loadData,
      });
    } finally {
      setSaving(false);
    }
  }, [house, loadData]);

  return {
    house,
    members,
    loading,
    loadError,
    saving,
    isCurrentUserHost,
    loadData,
    updateRole,
  };
}

import { useCallback, useEffect, useMemo, useState } from "react";
import { isPresetColor, toPresetColor, type PresetColor } from "@/shared/constants/house";
import { apiFetch, readJson } from "@/shared/lib/fetch-client";
import { isDataArrayResponse } from "@/shared/lib/response-guards";
import { submitApiAction } from "@/shared/lib/submit-api-action";
import type { House, HouseListResponse, Member, UserListResponse } from "@/types";

export function useProfileColor(userUid: string | null | undefined) {
  const [currentColor, setCurrentColor] = useState<PresetColor | null>(null);
  const [selectedColor, setSelectedColor] = useState<PresetColor | null>(null);
  const [takenColors, setTakenColors] = useState<PresetColor[]>([]);
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
      if (!housesResponse.ok || !usersResponse.ok) {
        setLoadError("プロフィール情報の取得に失敗しました");
        return;
      }

      const housesJson = await readJson<HouseListResponse>(housesResponse, isDataArrayResponse<House>);
      const usersJson = await readJson<UserListResponse>(usersResponse, isDataArrayResponse<Member>);
      const myHouse = housesJson.data.find((house) => house.memberUids.includes(userUid)) ?? null;
      const me = usersJson.data.find((member) => member.id === userUid);

      if (me) {
        const myColor = toPresetColor(me.color);
        setCurrentColor(myColor);
        setSelectedColor(myColor);
      }

      if (!myHouse) {
        setTakenColors([]);
        return;
      }

      const otherColors = usersJson.data
        .filter((member) => myHouse.memberUids.includes(member.id) && member.id !== userUid)
        .map((member) => member.color)
        .filter(isPresetColor);
      setTakenColors(otherColors);
    } catch {
      setLoadError("通信エラーが発生しました");
    } finally {
      setLoading(false);
    }
  }, [userUid]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const hasChanged = useMemo(
    () => selectedColor !== null && selectedColor !== currentColor,
    [currentColor, selectedColor]
  );

  const saveColor = useCallback(async () => {
    if (!selectedColor || !hasChanged) return;

    setSaving(true);
    try {
      await submitApiAction({
        request: () =>
          apiFetch("/api/profile", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ color: selectedColor }),
          }),
        successMessage: "テーマカラーを更新しました",
        fallbackErrorMessage: "カラーの更新に失敗しました",
        onSuccess: () => {
          setCurrentColor(selectedColor);
        },
      });
    } finally {
      setSaving(false);
    }
  }, [hasChanged, selectedColor]);

  return {
    currentColor,
    selectedColor,
    takenColors,
    loading,
    loadError,
    saving,
    hasChanged,
    setSelectedColor,
    loadData,
    saveColor,
  };
}

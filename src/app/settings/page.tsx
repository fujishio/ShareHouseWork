"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Bell, BellOff, Wallet } from "lucide-react";
import { HOUSE_MEMBERS, CURRENT_USER_ID, OWNER_MEMBER_NAME } from "@/shared/constants/house";
import {
  DEFAULT_NOTIFICATION_SETTINGS,
  saveNotificationSettings,
  loadNotificationSettings,
} from "@/shared/lib/notification-settings";
import type { ContributionSettings, NotificationSettings } from "@/types";
import { ErrorNotice, LoadingNotice, RetryNotice } from "@/components/RequestStatus";
import { getApiErrorMessage } from "@/shared/lib/api-error";
import { showToast } from "@/shared/lib/toast";

function SettingsToggle({
  title,
  description,
  checked,
  disabled = false,
  onChange,
}: {
  title: string;
  description: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (next: boolean) => void;
}) {
  return (
    <label className={`flex items-start justify-between gap-3 rounded-xl border p-3 ${disabled ? "bg-stone-50 border-stone-200" : "bg-white border-stone-200/60"}`}>
      <div className="min-w-0">
        <p className={`text-sm font-semibold ${disabled ? "text-stone-400" : "text-stone-800"}`}>
          {title}
        </p>
        <p className={`mt-0.5 text-xs ${disabled ? "text-stone-300" : "text-stone-500"}`}>
          {description}
        </p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={title}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-7 w-12 items-center rounded-full p-1 transition-colors ${checked ? "bg-amber-500" : "bg-stone-300"} ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
      >
        <span
          className={`h-5 w-5 rounded-full bg-white transition-transform ${checked ? "translate-x-5" : "translate-x-0"}`}
        />
      </button>
    </label>
  );
}

const DEFAULT_CONTRIBUTION: ContributionSettings = {
  monthlyAmountPerPerson: 15000,
  memberCount: 4,
};

export default function SettingsPage() {
  const [settings, setSettings] = useState<NotificationSettings>(
    DEFAULT_NOTIFICATION_SETTINGS
  );
  const [exportMonth, setExportMonth] = useState(new Date().toISOString().slice(0, 7));
  const [savedAt, setSavedAt] = useState<Date | null>(null);

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
  const currentUserName = (HOUSE_MEMBERS.find((m) => m.id === CURRENT_USER_ID) ?? HOUSE_MEMBERS[0]).name;
  const canEditContributionSettings = currentUserName === OWNER_MEMBER_NAME;

  const loadContributionSettings = useCallback(async () => {
    setContributionLoading(true);
    setContributionLoadError(null);
    try {
      const response = await fetch("/api/settings/contribution");
      if (!response.ok) {
        const message = await getApiErrorMessage(response, "共益費設定の取得に失敗しました");
        setContributionLoadError(message);
        showToast({ level: "error", message });
        return;
      }
      const json = (await response.json()) as { data: ContributionSettings };
      setContributionAmount(String(json.data.monthlyAmountPerPerson));
      setContributionMemberCount(String(json.data.memberCount));
    } catch {
      const message = "通信エラーが発生しました";
      setContributionLoadError(message);
      showToast({ level: "error", message });
    } finally {
      setContributionLoading(false);
    }
  }, []);

  useEffect(() => {
    setSettings(loadNotificationSettings());
    void loadContributionSettings();
  }, [loadContributionSettings]);

  async function saveContributionSettings() {
    if (!canEditContributionSettings) return;

    const amount = Number(contributionAmount);
    const memberCount = Number(contributionMemberCount);

    if (!Number.isFinite(amount) || amount <= 0) return;
    if (!Number.isInteger(memberCount) || memberCount < 1) return;

    setContributionSaving(true);
    setContributionError(null);
    try {
      const response = await fetch("/api/settings/contribution", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-sharehouse-actor": currentUserName,
        },
        body: JSON.stringify({ monthlyAmountPerPerson: amount, memberCount }),
      });
      if (response.ok) {
        setContributionSavedAt(new Date());
        showToast({ level: "success", message: "共益費設定を保存しました" });
      } else {
        const message = await getApiErrorMessage(response, "共益費設定の保存に失敗しました");
        setContributionError(message);
        showToast({ level: "error", message });
      }
    } catch {
      const message = "通信エラーが発生しました";
      setContributionError(message);
      showToast({ level: "error", message });
    } finally {
      setContributionSaving(false);
    }
  }

  const statusMessage = useMemo(() => {
    if (!savedAt) {
      return "設定は自動保存されます";
    }
    return "保存しました";
  }, [savedAt]);

  const updateSettings = (next: NotificationSettings) => {
    setSettings(next);
    saveNotificationSettings(next);
    setSavedAt(new Date());
  };

  return (
    <div className="space-y-4">
      {contributionSaving && <LoadingNotice message="設定を保存中..." />}

      <div className="bg-white rounded-2xl shadow-sm border border-stone-200/60 p-4">
        <div className="flex items-center gap-2">
          {settings.enabled ? (
            <Bell size={18} className="text-amber-500" />
          ) : (
            <BellOff size={18} className="text-stone-400" />
          )}
          <h2 className="font-bold text-stone-800">LINE通知設定</h2>
        </div>
        <p className="mt-2 text-sm text-stone-500">
          LINEで受け取りたい通知の粒度を選択できます。
        </p>
        <p className="mt-1 text-xs text-stone-400">{statusMessage}</p>
      </div>

      <div className="space-y-2">
        <SettingsToggle
          title="LINEで通知を受け取る"
          description="LINEへの通知送信をON/OFFします。"
          checked={settings.enabled}
          onChange={(enabled) =>
            updateSettings({
              ...settings,
              enabled,
              importantOnly: enabled ? settings.importantOnly : false,
            })
          }
        />
        <SettingsToggle
          title="重要なお知らせのみ"
          description="重要フラグが付いた通知だけをLINEに送信します。"
          checked={settings.importantOnly}
          disabled={!settings.enabled}
          onChange={(importantOnly) =>
            updateSettings({
              ...settings,
              importantOnly,
            })
          }
        />
      </div>

      <button
        type="button"
        onClick={() => {
          setSettings(DEFAULT_NOTIFICATION_SETTINGS);
          saveNotificationSettings(DEFAULT_NOTIFICATION_SETTINGS);
          setSavedAt(new Date());
        }}
        className="w-full rounded-xl border border-stone-300 bg-white py-2.5 text-sm font-medium text-stone-700 hover:bg-stone-50 transition-colors"
      >
        通知設定を初期値に戻す
      </button>

      {/* Contribution settings */}
      <div className="rounded-2xl border border-stone-200/60 bg-white p-4">
        <div className="flex items-center gap-2 mb-1">
          <Wallet size={18} className="text-amber-500" />
          <h3 className="text-sm font-bold text-stone-800">共益費設定</h3>
        </div>
        {contributionLoading && (
          <div className="mb-3">
            <LoadingNotice message="共益費設定を読み込み中..." />
          </div>
        )}
        {contributionLoadError && (
          <div className="mb-3">
            <RetryNotice
              message={contributionLoadError}
              actionLabel="再取得"
              onRetry={() => {
                void loadContributionSettings();
              }}
              disabled={contributionLoading}
            />
          </div>
        )}
        <p className="mt-1 text-xs text-stone-500 mb-3">
          月次拠出合計 = 1人あたり金額 × 人数 で算出されます。
          保存した設定は当月から適用されます。
        </p>
        {!canEditContributionSettings && (
          <p className="mb-3 rounded-xl bg-stone-100 px-3 py-2 text-xs text-stone-600">
            共益費設定は家主のみ変更できます。
          </p>
        )}
        <div className="grid grid-cols-2 gap-2 mb-3">
          <div>
            <label
              htmlFor="contribution-amount"
              className="mb-1 block text-xs font-medium text-stone-600"
            >
              1人あたり（円/月）
            </label>
            <input
              id="contribution-amount"
              type="number"
              min={1}
              value={contributionAmount}
              onChange={(e) => setContributionAmount(e.target.value)}
              disabled={!canEditContributionSettings}
              className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm text-stone-800 focus:outline-none focus:ring-2 focus:ring-amber-300"
            />
          </div>
          <div>
            <label
              htmlFor="contribution-members"
              className="mb-1 block text-xs font-medium text-stone-600"
            >
              人数
            </label>
            <input
              id="contribution-members"
              type="number"
              min={1}
              max={20}
              value={contributionMemberCount}
              onChange={(e) => setContributionMemberCount(e.target.value)}
              disabled={!canEditContributionSettings}
              className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm text-stone-800 focus:outline-none focus:ring-2 focus:ring-amber-300"
            />
          </div>
        </div>
        <div className="mb-3 rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-800">
          月次拠出合計:{" "}
          <span className="font-bold">
            ¥{(Number(contributionAmount) * Number(contributionMemberCount) || 0).toLocaleString()}
          </span>
        </div>
        <button
          type="button"
          onClick={saveContributionSettings}
          disabled={contributionSaving || !canEditContributionSettings}
          className="w-full rounded-xl bg-amber-500 py-2.5 text-sm font-semibold text-white hover:bg-amber-600 transition-colors disabled:opacity-60"
        >
          {contributionSaving ? "保存中…" : "保存する"}
        </button>
        {contributionError && (
          <div className="mt-2">
            <ErrorNotice message={contributionError} />
          </div>
        )}
        {contributionSavedAt && (
          <p className="mt-2 text-center text-xs text-stone-400">
            保存しました
          </p>
        )}
      </div>

      <div className="rounded-2xl border border-stone-200/60 bg-white p-4">
        <h3 className="text-sm font-bold text-stone-800">月次データエクスポート</h3>
        <p className="mt-1 text-xs text-stone-500">
          運用実績をCSVでダウンロードできます。
        </p>
        <div className="mt-3 flex items-center gap-2">
          <input
            type="month"
            value={exportMonth}
            onChange={(event) => setExportMonth(event.target.value)}
            className="h-10 flex-1 rounded-lg border border-stone-300 px-3 text-sm text-stone-700 focus:outline-none focus:ring-2 focus:ring-amber-300"
            aria-label="エクスポート対象月"
          />
          <a
            href={`/api/exports/monthly.csv?month=${encodeURIComponent(exportMonth)}`}
            className="inline-flex h-10 items-center rounded-lg bg-amber-500 px-4 text-sm font-semibold text-white hover:bg-amber-600"
          >
            CSV出力
          </a>
        </div>
      </div>
    </div>
  );
}

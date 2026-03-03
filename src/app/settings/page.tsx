"use client";

import { useMemo, useState } from "react";
import { Bell, BellOff } from "lucide-react";
import { useRouter } from "next/navigation";
import { HOUSE_MEMBERS, OWNER_MEMBER_NAME } from "@/shared/constants/house";
import { useAuth } from "@/context/AuthContext";
import {
  DEFAULT_NOTIFICATION_SETTINGS,
  loadNotificationSettings,
  saveNotificationSettings,
} from "@/shared/lib/notification-settings";
import type { NotificationSettings } from "@/types";
import { LoadingNotice } from "@/components/RequestStatus";
import { showToast } from "@/shared/lib/toast";
import { ContributionSettingsSection } from "@/components/sections/settings/ContributionSettingsSection";
import { ProfileColorSection } from "@/components/sections/settings/ProfileColorSection";
import { TaskManagementSection } from "@/components/sections/settings/TaskManagementSection";
import { MemberManagementSection } from "@/components/sections/settings/MemberManagementSection";

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
    <label
      className={`flex items-start justify-between gap-3 rounded-xl border p-3 ${
        disabled ? "border-stone-200 bg-stone-50" : "border-stone-200/60 bg-white"
      }`}
    >
      <div className="min-w-0">
        <p className={`text-sm font-semibold ${disabled ? "text-stone-400" : "text-stone-800"}`}>{title}</p>
        <p className={`mt-0.5 text-xs ${disabled ? "text-stone-300" : "text-stone-500"}`}>{description}</p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={title}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-7 w-12 items-center rounded-full p-1 transition-colors ${
          checked ? "bg-amber-500" : "bg-stone-300"
        } ${disabled ? "cursor-not-allowed opacity-50" : ""}`}
      >
        <span
          className={`h-5 w-5 rounded-full bg-white transition-transform ${
            checked ? "translate-x-5" : "translate-x-0"
          }`}
        />
      </button>
    </label>
  );
}

export default function SettingsPage() {
  const router = useRouter();
  const [settings, setSettings] = useState<NotificationSettings>(loadNotificationSettings());
  const [exportMonth, setExportMonth] = useState(new Date().toISOString().slice(0, 7));
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const [signingOut, setSigningOut] = useState(false);

  const { user, signOut } = useAuth();
  const currentUserName = user?.displayName ?? HOUSE_MEMBERS[0].name;
  const canEditContributionSettings = currentUserName === OWNER_MEMBER_NAME;

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

  const handleSignOut = async () => {
    setSigningOut(true);
    try {
      await signOut();
      router.replace("/login");
    } catch {
      showToast({ level: "error", message: "ログアウトに失敗しました" });
    } finally {
      setSigningOut(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-stone-200/60 bg-white p-4 shadow-sm">
        <div className="flex items-center gap-2">
          {settings.enabled ? (
            <Bell size={18} className="text-amber-500" />
          ) : (
            <BellOff size={18} className="text-stone-400" />
          )}
          <h2 className="font-bold text-stone-800">メール通知設定</h2>
        </div>
        <p className="mt-2 text-sm text-stone-500">メールで受け取りたい通知の粒度を選択できます。</p>
        <p className="mt-1 text-xs text-stone-400">{statusMessage}</p>
      </div>

      <div className="space-y-2">
        <SettingsToggle
          title="メールで通知を受け取る"
          description="メールへの通知送信をON/OFFします。"
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
          description="重要フラグが付いた通知だけをメールに送信します。"
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
        className="w-full rounded-xl border border-stone-300 bg-white py-2.5 text-sm font-medium text-stone-700 transition-colors hover:bg-stone-50"
      >
        通知設定を初期値に戻す
      </button>

      <ContributionSettingsSection canEdit={canEditContributionSettings} />

      <ProfileColorSection />

      <TaskManagementSection />

      <MemberManagementSection />

      <div className="rounded-2xl border border-stone-200/60 bg-white p-4">
        <h3 className="text-sm font-bold text-stone-800">月次データエクスポート</h3>
        <p className="mt-1 text-xs text-stone-500">運用実績をCSVでダウンロードできます。</p>
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

      {signingOut && <LoadingNotice message="ログアウト中..." />}

      <div className="rounded-2xl border border-stone-200/60 bg-white p-4">
        <h3 className="text-sm font-bold text-stone-800">アカウント</h3>
        <p className="mt-1 text-xs text-stone-500">現在のアカウントからログアウトします。</p>
        <button
          type="button"
          onClick={() => {
            void handleSignOut();
          }}
          disabled={signingOut}
          className="mt-3 w-full rounded-xl border border-red-200 bg-red-50 py-2.5 text-sm font-semibold text-red-700 transition-colors hover:bg-red-100 disabled:opacity-60"
        >
          {signingOut ? "ログアウト中…" : "ログアウト"}
        </button>
      </div>
    </div>
  );
}

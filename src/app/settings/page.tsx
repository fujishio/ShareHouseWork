"use client";

import { useEffect, useMemo, useState } from "react";
import { Bell, BellOff } from "lucide-react";
import {
  DEFAULT_NOTIFICATION_SETTINGS,
  saveNotificationSettings,
  loadNotificationSettings,
} from "@/shared/lib/notification-settings";
import type { NotificationSettings } from "@/types";

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
        className={`relative h-7 w-12 rounded-full transition-colors ${checked ? "bg-amber-500" : "bg-stone-300"} ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
      >
        <span
          className={`absolute top-1 h-5 w-5 rounded-full bg-white transition-transform ${checked ? "translate-x-6" : "translate-x-1"}`}
        />
      </button>
    </label>
  );
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<NotificationSettings>(
    DEFAULT_NOTIFICATION_SETTINGS
  );
  const [exportMonth, setExportMonth] = useState(new Date().toISOString().slice(0, 7));
  const [savedAt, setSavedAt] = useState<Date | null>(null);

  useEffect(() => {
    setSettings(loadNotificationSettings());
  }, []);

  const statusMessage = useMemo(() => {
    if (!savedAt) {
      return "設定は自動保存されます";
    }
    return `${savedAt.toLocaleTimeString("ja-JP")} に保存しました`;
  }, [savedAt]);

  const updateSettings = (next: NotificationSettings) => {
    setSettings(next);
    saveNotificationSettings(next);
    setSavedAt(new Date());
  };

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-2xl shadow-sm border border-stone-200/60 p-4">
        <div className="flex items-center gap-2">
          {settings.enabled ? (
            <Bell size={18} className="text-amber-500" />
          ) : (
            <BellOff size={18} className="text-stone-400" />
          )}
          <h2 className="font-bold text-stone-800">通知設定</h2>
        </div>
        <p className="mt-2 text-sm text-stone-500">
          受け取りたい通知の粒度を選択できます。
        </p>
        <p className="mt-1 text-xs text-stone-400">{statusMessage}</p>
      </div>

      <div className="space-y-2">
        <SettingsToggle
          title="通知を受け取る"
          description="アプリ内のお知らせ通知をON/OFFします。"
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
          description="重要フラグが付いた通知だけを表示します。"
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

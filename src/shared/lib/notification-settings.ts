import type { NotificationSettings } from "@/types";

const STORAGE_KEY = "share-house-work:notification-settings";

export const DEFAULT_NOTIFICATION_SETTINGS: NotificationSettings = {
  enabled: true,
  importantOnly: false,
};

function hasStorage() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

export function loadNotificationSettings(): NotificationSettings {
  if (!hasStorage()) {
    return DEFAULT_NOTIFICATION_SETTINGS;
  }

  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return DEFAULT_NOTIFICATION_SETTINGS;
  }

  try {
    const parsed = JSON.parse(raw) as Partial<NotificationSettings>;
    return {
      enabled:
        typeof parsed.enabled === "boolean"
          ? parsed.enabled
          : DEFAULT_NOTIFICATION_SETTINGS.enabled,
      importantOnly:
        typeof parsed.importantOnly === "boolean"
          ? parsed.importantOnly
          : DEFAULT_NOTIFICATION_SETTINGS.importantOnly,
    };
  } catch {
    return DEFAULT_NOTIFICATION_SETTINGS;
  }
}

export function saveNotificationSettings(settings: NotificationSettings) {
  if (!hasStorage()) {
    return;
  }
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
}

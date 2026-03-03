import type { NotificationSettings } from "@/types";

const STORAGE_KEY = "share-house-work:notification-settings";

export const DEFAULT_NOTIFICATION_SETTINGS: NotificationSettings = {
  enabled: true,
  importantOnly: false,
};

function isNotificationSettingsLike(value: unknown): value is Partial<NotificationSettings> {
  if (!value || typeof value !== "object") return false;
  const enabled = Reflect.get(value, "enabled");
  const importantOnly = Reflect.get(value, "importantOnly");
  if (enabled !== undefined && typeof enabled !== "boolean") {
    return false;
  }
  if (importantOnly !== undefined && typeof importantOnly !== "boolean") {
    return false;
  }
  return true;
}

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
    const parsedUnknown: unknown = JSON.parse(raw);
    const parsed = isNotificationSettingsLike(parsedUnknown) ? parsedUnknown : {};
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

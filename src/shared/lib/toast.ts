export type ToastLevel = "success" | "error" | "info";

export type ToastPayload = {
  message: string;
  level?: ToastLevel;
};

const TOAST_EVENT = "sharehouse:toast";

export function showToast(payload: ToastPayload) {
  if (typeof window === "undefined") {
    return;
  }
  window.dispatchEvent(new CustomEvent<ToastPayload>(TOAST_EVENT, { detail: payload }));
}

export function getToastEventName() {
  return TOAST_EVENT;
}

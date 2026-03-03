"use client";

import { useEffect, useMemo, useState } from "react";
import { getToastEventName, type ToastLevel, type ToastPayload } from "@/shared/lib/toast";

type ToastItem = {
  id: number;
  message: string;
  level: ToastLevel;
};

const MAX_ITEMS = 3;
const AUTO_CLOSE_MS = 2600;

function toneClass(level: ToastLevel) {
  if (level === "success") {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }
  if (level === "error") {
    return "border-red-200 bg-red-50 text-red-700";
  }
  return "border-stone-200 bg-white text-stone-700";
}

function isToastPayload(value: unknown): value is ToastPayload {
  if (!value || typeof value !== "object") return false;
  const message = Reflect.get(value, "message");
  const level = Reflect.get(value, "level");
  if (typeof message !== "string") return false;
  if (
    level !== undefined &&
    level !== "success" &&
    level !== "error" &&
    level !== "info"
  ) {
    return false;
  }
  return true;
}

export default function ToastViewport() {
  const [items, setItems] = useState<ToastItem[]>([]);

  useEffect(() => {
    function onToast(event: Event) {
      if (!(event instanceof CustomEvent) || !isToastPayload(event.detail)) {
        return;
      }
      const message = event.detail.message.trim();
      if (!message) return;

      const next: ToastItem = {
        id: Date.now() + Math.floor(Math.random() * 1000),
        message,
        level: event.detail.level ?? "info",
      };

      setItems((prev) => [next, ...prev].slice(0, MAX_ITEMS));
      setTimeout(() => {
        setItems((prev) => prev.filter((item) => item.id !== next.id));
      }, AUTO_CLOSE_MS);
    }

    const eventName = getToastEventName();
    window.addEventListener(eventName, onToast);
    return () => {
      window.removeEventListener(eventName, onToast);
    };
  }, []);

  const visible = useMemo(() => items, [items]);

  if (visible.length === 0) {
    return null;
  }

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-20 z-50 flex flex-col items-center gap-2 px-4">
      {visible.map((item) => (
        <div
          key={item.id}
          className={`w-full max-w-md rounded-xl border px-3 py-2 text-sm shadow-sm ${toneClass(item.level)}`}
          role="status"
          aria-live="polite"
        >
          {item.message}
        </div>
      ))}
    </div>
  );
}

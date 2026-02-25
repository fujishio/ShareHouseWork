"use client";

import { useState, useMemo, useRef, useEffect, useCallback } from "react";
import { Check, X, Plus, Star, ChevronLeft } from "lucide-react";
import { TASKS } from "@/domain/tasks";
import type {
  ApiErrorResponse,
  CreateTaskCompletionInput,
  TaskCompletionCreateResponse,
} from "@/types";

export default function TaskCompleteFAB() {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [completedTaskId, setCompletedTaskId] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(
    null
  );
  const modalRef = useRef<HTMLDivElement | null>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  const categories = useMemo(() => {
    const map = new Map<string, number>();
    for (const task of TASKS) {
      map.set(task.category, (map.get(task.category) ?? 0) + 1);
    }
    return Array.from(map.entries()).map(([name, count]) => ({ name, count }));
  }, []);

  const filteredTasks = useMemo(
    () => TASKS.filter((t) => t.category === selectedCategory),
    [selectedCategory]
  );

  const handleComplete = async (taskId: number) => {
    if (isSubmitting) {
      return;
    }

    setCompletedTaskId(taskId);
    setIsSubmitting(true);
    setFeedback(null);

    try {
      const response = await fetch("/api/task-completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          taskId,
          completedBy: "あなた",
          completedAt: new Date().toISOString(),
          source: "app",
        } satisfies CreateTaskCompletionInput),
      });

      const result = (await response.json().catch(() => null)) as
        | TaskCompletionCreateResponse
        | ApiErrorResponse
        | null;

      if (!response.ok) {
        throw new Error(
          result && "error" in result ? result.error : "完了報告の保存に失敗しました"
        );
      }

      setFeedback({ type: "success", message: "完了報告を保存しました" });
      setTimeout(() => {
        setCompletedTaskId(null);
        setSelectedCategory(null);
        setIsOpen(false);
        setFeedback(null);
      }, 1000);
    } catch (error) {
      setCompletedTaskId(null);
      setFeedback({
        type: "error",
        message: error instanceof Error ? error.message : "通信エラーが発生しました",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = useCallback(() => {
    setIsOpen(false);
    setSelectedCategory(null);
    setCompletedTaskId(null);
    setFeedback(null);
    setIsSubmitting(false);
  }, []);

  useEffect(() => {
    if (!isOpen) {
      if (previousFocusRef.current) {
        previousFocusRef.current.focus();
        previousFocusRef.current = null;
      }
      return;
    }

    previousFocusRef.current = document.activeElement as HTMLElement | null;
    const modal = modalRef.current;
    if (!modal) {
      return;
    }

    const getFocusable = () =>
      Array.from(
        modal.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
        )
      );

    const focusable = getFocusable();
    focusable[0]?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        handleClose();
        return;
      }

      if (event.key !== "Tab") {
        return;
      }

      const elements = getFocusable();
      if (elements.length === 0) {
        event.preventDefault();
        return;
      }

      const first = elements[0];
      const last = elements[elements.length - 1];
      const active = document.activeElement as HTMLElement | null;

      if (event.shiftKey && active === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [isOpen, handleClose]);

  return (
    <>
      {/* FAB Button */}
      <button
        onClick={() => setIsOpen(true)}
        className="fixed right-4 bottom-20 z-20 w-14 h-14 rounded-full bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-white shadow-lg shadow-amber-500/30 flex items-center justify-center transition-all active:scale-95"
        style={{ marginBottom: "var(--safe-area-bottom)" }}
        aria-label="タスク完了報告"
      >
        <Plus size={28} strokeWidth={2.5} />
      </button>

      {/* Modal Overlay */}
      {isOpen && (
        <div className="fixed inset-0 z-50">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/30"
            onClick={handleClose}
          />

          {/* Modal - bottom-right quarter */}
          <div
            ref={modalRef}
            className="absolute right-0 bottom-0 w-1/2 h-1/2 p-3"
            style={{ paddingBottom: "calc(0.75rem + var(--safe-area-bottom))" }}
            role="dialog"
            aria-modal="true"
            aria-label="タスク完了報告モーダル"
          >
            <div className="w-full h-full bg-white rounded-2xl shadow-xl flex flex-col overflow-hidden animate-slide-up">
              {/* Header */}
              <div className="flex items-center justify-between px-4 pt-3 pb-2 border-b border-stone-100 shrink-0">
                <div className="flex items-center gap-1">
                  {selectedCategory && (
                    <button
                      onClick={() => setSelectedCategory(null)}
                      className="w-6 h-6 rounded-full hover:bg-stone-100 flex items-center justify-center transition-colors"
                      aria-label="戻る"
                    >
                      <ChevronLeft size={16} className="text-stone-500" />
                    </button>
                  )}
                  <h2 className="text-sm font-bold text-stone-800">
                    {selectedCategory ?? "ジャンル選択"}
                  </h2>
                </div>
                <button
                  onClick={handleClose}
                  className="w-6 h-6 rounded-full bg-stone-100 hover:bg-stone-200 flex items-center justify-center transition-colors"
                  aria-label="閉じる"
                >
                  <X size={14} className="text-stone-500" />
                </button>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto px-3 py-2">
                {feedback && (
                  <div
                    className={`mb-2 rounded-lg px-3 py-2 text-xs font-medium ${
                      feedback.type === "success"
                        ? "bg-emerald-50 text-emerald-700"
                        : "bg-red-50 text-red-700"
                    }`}
                    aria-live="polite"
                  >
                    {feedback.message}
                  </div>
                )}
                {!selectedCategory ? (
                  /* Category List */
                  <div className="space-y-1.5">
                    {categories.map((cat) => (
                      <button
                        key={cat.name}
                        onClick={() => setSelectedCategory(cat.name)}
                        className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl bg-stone-50 border border-stone-200/60 hover:bg-stone-100 active:bg-stone-200 transition-colors"
                      >
                        <span className="text-sm font-medium text-stone-700">
                          {cat.name}
                        </span>
                        <span className="text-xs text-stone-400">
                          {cat.count}件
                        </span>
                      </button>
                    ))}
                  </div>
                ) : (
                  /* Task List */
                  <div className="space-y-1.5">
                    {filteredTasks.map((task) => {
                      const isCompleted = completedTaskId === task.id;
                      return (
                        <button
                          key={task.id}
                          onClick={() =>
                            !completedTaskId &&
                            handleComplete(task.id)
                          }
                          disabled={!!completedTaskId || isSubmitting}
                          className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl border transition-all ${
                            isCompleted
                              ? "bg-amber-50 border-amber-300"
                              : "bg-stone-50 border-stone-200/60 hover:bg-stone-100 active:bg-stone-200"
                          } ${isSubmitting && !isCompleted ? "opacity-40" : ""}`}
                        >
                          <div className="flex items-center gap-2">
                            <div
                              className={`w-6 h-6 rounded-full flex items-center justify-center transition-all ${
                                isCompleted
                                  ? "bg-amber-500 text-white scale-110"
                                  : "bg-stone-200 text-stone-400"
                              }`}
                            >
                              <Check size={12} strokeWidth={2.5} />
                            </div>
                            <span
                              className={`text-xs font-medium ${
                                isCompleted ? "text-amber-700" : "text-stone-700"
                              }`}
                            >
                              {isCompleted && isSubmitting ? "保存中..." : task.name}
                            </span>
                          </div>
                          <span
                            className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full flex items-center gap-0.5 shrink-0 ${
                              isCompleted
                                ? "bg-amber-200 text-amber-800"
                                : "bg-amber-100 text-amber-700"
                            }`}
                          >
                            <Star size={8} fill="currentColor" />
                            +{task.points}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

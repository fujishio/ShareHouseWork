"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { usePathname } from "next/navigation";
import { Plus, ShoppingCart, Bell, Wallet, X } from "lucide-react";
import TaskCompleteModal from "./modals/TaskCompleteModal";
import ShoppingFormModal from "./modals/ShoppingFormModal";
import NoticeFormModal from "./modals/NoticeFormModal";
import ExpenseFormModal from "./modals/ExpenseFormModal";

type FABConfig = {
  icon: React.ReactNode;
  label: string;
  modalTitle: string;
};

function getFABConfig(pathname: string): FABConfig | null {
  if (pathname === "/" || pathname === "/tasks") {
    return {
      icon: <Plus size={28} strokeWidth={2.5} />,
      label: "タスク完了報告",
      modalTitle: "タスク完了報告",
    };
  }
  if (pathname === "/shopping") {
    return {
      icon: <ShoppingCart size={24} strokeWidth={2} />,
      label: "買い物を追加",
      modalTitle: "買い物を追加",
    };
  }
  if (pathname === "/notices") {
    return {
      icon: <Bell size={24} strokeWidth={2} />,
      label: "お知らせを投稿",
      modalTitle: "お知らせを投稿",
    };
  }
  if (pathname === "/expenses") {
    return {
      icon: <Wallet size={24} strokeWidth={2} />,
      label: "支出を記録",
      modalTitle: "支出を記録",
    };
  }
  return null;
}

export default function ContextualFAB() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const modalRef = useRef<HTMLDivElement | null>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  const config = getFABConfig(pathname);

  const handleClose = useCallback(() => {
    setIsOpen(false);
  }, []);

  // Close modal on route change
  useEffect(() => {
    setIsOpen(false);
  }, [pathname]);

  // Focus trap + Escape key
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
    if (!modal) return;

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

      if (event.key !== "Tab") return;

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

  if (!config) return null;

  const renderModalContent = () => {
    if (pathname === "/" || pathname === "/tasks") {
      return <TaskCompleteModal onClose={handleClose} />;
    }
    if (pathname === "/shopping") {
      return <ShoppingFormModal onClose={handleClose} />;
    }
    if (pathname === "/notices") {
      return <NoticeFormModal onClose={handleClose} />;
    }
    if (pathname === "/expenses") {
      return <ExpenseFormModal onClose={handleClose} />;
    }
    return null;
  };

  return (
    <>
      {/* FAB Button */}
      <button
        onClick={() => setIsOpen(true)}
        className="fixed right-4 bottom-20 z-20 w-14 h-14 rounded-full bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-white shadow-lg shadow-amber-500/30 flex items-center justify-center transition-all active:scale-95"
        style={{ marginBottom: "var(--safe-area-bottom)" }}
        aria-label={config.label}
      >
        {config.icon}
      </button>

      {/* Modal Overlay */}
      {isOpen && (
        <div className="fixed inset-0 z-50">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/30"
            onClick={handleClose}
          />

          {/* Modal - bottom-right, auto-sized to content */}
          <div
            ref={modalRef}
            className="absolute right-0 bottom-0 w-1/2 max-h-[85vh] p-3"
            style={{ paddingBottom: "calc(0.75rem + var(--safe-area-bottom))" }}
            role="dialog"
            aria-modal="true"
            aria-label={config.modalTitle}
          >
            <div className="bg-white rounded-2xl shadow-xl flex flex-col overflow-hidden animate-slide-up relative max-h-[calc(85vh-1.5rem)]">
              {/* Close button */}
              <button
                onClick={handleClose}
                className="absolute top-3 right-3 w-6 h-6 rounded-full bg-stone-100 hover:bg-stone-200 flex items-center justify-center transition-colors z-10"
                aria-label="閉じる"
              >
                <X size={14} className="text-stone-500" />
              </button>

              {renderModalContent()}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

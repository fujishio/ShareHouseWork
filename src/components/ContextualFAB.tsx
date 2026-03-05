"use client";

import { X } from "lucide-react";
import TaskCompleteModal from "./modals/TaskCompleteModal";
import ShoppingFormModal from "./modals/ShoppingFormModal";
import NoticeFormModal from "./modals/NoticeFormModal";
import ExpenseFormModal from "./modals/ExpenseFormModal";
import RuleFormModal from "./modals/RuleFormModal";
import { useContextualFAB } from "@/hooks/useContextualFAB";

export default function ContextualFAB() {
  const { pathname, config, isOpen, modalRef, openModal, closeModal } = useContextualFAB();

  if (!config) return null;

  const renderModalContent = () => {
    if (pathname === "/" || pathname === "/tasks") {
      return <TaskCompleteModal onClose={closeModal} />;
    }
    if (pathname === "/shopping") {
      return <ShoppingFormModal onClose={closeModal} />;
    }
    if (pathname === "/notices") {
      return <NoticeFormModal onClose={closeModal} />;
    }
    if (pathname === "/expenses") {
      return <ExpenseFormModal onClose={closeModal} />;
    }
    if (pathname === "/rules") {
      return <RuleFormModal onClose={closeModal} />;
    }
    return null;
  };

  return (
    <>
      <button
        onClick={openModal}
        className="fixed right-4 bottom-20 z-20 w-14 h-14 rounded-full bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-white shadow-lg shadow-amber-500/30 flex items-center justify-center transition-all active:scale-95"
        style={{ marginBottom: "var(--safe-area-bottom)" }}
        aria-label={config.label}
      >
        {config.icon}
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/30" onClick={closeModal} />

          <div
            ref={modalRef}
            className="absolute right-0 bottom-0 w-1/2 max-h-[85vh] p-3"
            style={{ paddingBottom: "calc(0.75rem + var(--safe-area-bottom))" }}
            role="dialog"
            aria-modal="true"
            aria-label={config.modalTitle}
          >
            <div className="bg-white rounded-2xl shadow-xl flex flex-col overflow-hidden animate-slide-up relative max-h-[calc(85vh-1.5rem)]">
              <button
                onClick={closeModal}
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

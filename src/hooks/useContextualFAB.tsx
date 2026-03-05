import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { Plus, ShoppingCart, Bell, Wallet, BookOpen } from "lucide-react";
import type { ReactNode } from "react";

export type FABConfig = {
  icon: ReactNode;
  label: string;
  modalTitle: string;
};

function getActiveHtmlElement(): HTMLElement | null {
  const active = document.activeElement;
  return active instanceof HTMLElement ? active : null;
}

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
  if (pathname === "/rules") {
    return {
      icon: <BookOpen size={24} strokeWidth={2} />,
      label: "ルールを追加",
      modalTitle: "ルールを追加",
    };
  }
  return null;
}

export function useContextualFAB() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const modalRef = useRef<HTMLDivElement | null>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  const config = useMemo(() => getFABConfig(pathname), [pathname]);

  const openModal = useCallback(() => {
    setIsOpen(true);
  }, []);

  const closeModal = useCallback(() => {
    setIsOpen(false);
  }, []);

  useEffect(() => {
    setIsOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!isOpen) {
      if (previousFocusRef.current) {
        previousFocusRef.current.focus();
        previousFocusRef.current = null;
      }
      return;
    }

    previousFocusRef.current = getActiveHtmlElement();
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
        closeModal();
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
      const active = getActiveHtmlElement();

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
  }, [closeModal, isOpen]);

  return {
    pathname,
    config,
    isOpen,
    modalRef,
    openModal,
    closeModal,
  };
}

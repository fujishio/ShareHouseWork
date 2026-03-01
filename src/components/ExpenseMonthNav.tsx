"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";

type Props = {
  monthLabel: string;
  prevMonthKey: string;
  nextMonthKey: string;
  canGoNext: boolean;
};

export default function ExpenseMonthNav({
  monthLabel,
  prevMonthKey,
  nextMonthKey,
  canGoNext,
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function navigate(monthKey: string) {
    startTransition(() => {
      router.push(`?month=${monthKey}`);
    });
  }

  return (
    <div className={`flex items-center justify-between px-1 transition-opacity ${isPending ? "opacity-50" : ""}`}>
      <button
        type="button"
        onClick={() => navigate(prevMonthKey)}
        disabled={isPending}
        aria-label="前の月"
        className="flex h-9 w-9 items-center justify-center rounded-full text-stone-500 hover:bg-stone-100 transition-colors disabled:cursor-wait"
      >
        {isPending ? (
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-stone-300 border-t-stone-500" />
        ) : (
          <ChevronLeft size={20} />
        )}
      </button>
      <span className="text-base font-bold text-stone-800">{monthLabel}</span>
      {canGoNext ? (
        <button
          type="button"
          onClick={() => navigate(nextMonthKey)}
          disabled={isPending}
          aria-label="次の月"
          className="flex h-9 w-9 items-center justify-center rounded-full text-stone-500 hover:bg-stone-100 transition-colors disabled:cursor-wait"
        >
          <ChevronRight size={20} />
        </button>
      ) : (
        <button
          type="button"
          disabled
          aria-label="次の月（現在月のため無効）"
          className="flex h-9 w-9 items-center justify-center rounded-full text-stone-300 cursor-not-allowed"
        >
          <ChevronRight size={20} />
        </button>
      )}
    </div>
  );
}

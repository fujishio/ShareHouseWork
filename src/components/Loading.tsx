type LoadingProps = {
  message?: string;
  compact?: boolean;
};

export default function Loading({ message = "読み込み中...", compact = false }: LoadingProps) {
  if (compact) {
    return (
      <div className="inline-flex items-center gap-2 rounded-lg border border-stone-200 bg-stone-50 px-3 py-2 text-xs text-stone-600">
        <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-stone-300 border-t-stone-500" />
        {message}
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-stone-200/60 bg-white p-4 shadow-sm" role="status" aria-live="polite">
      <div className="flex items-center gap-2">
        <span className="h-4 w-4 animate-spin rounded-full border-2 border-stone-300 border-t-stone-500" />
        <p className="text-sm font-medium text-stone-700">{message}</p>
      </div>
    </div>
  );
}

export function PageSkeleton() {
  return (
    <div className="space-y-4" aria-hidden="true">
      <div className="rounded-2xl border border-stone-200/60 bg-white p-4 shadow-sm">
        <div className="h-4 w-24 animate-pulse rounded bg-stone-200" />
        <div className="mt-3 space-y-2">
          <div className="h-3 w-full animate-pulse rounded bg-stone-100" />
          <div className="h-3 w-4/5 animate-pulse rounded bg-stone-100" />
        </div>
      </div>

      <div className="rounded-2xl border border-stone-200/60 bg-white p-4 shadow-sm">
        <div className="h-4 w-20 animate-pulse rounded bg-stone-200" />
        <div className="mt-3 space-y-2">
          <div className="h-10 w-full animate-pulse rounded-xl bg-stone-100" />
          <div className="h-10 w-full animate-pulse rounded-xl bg-stone-100" />
          <div className="h-10 w-full animate-pulse rounded-xl bg-stone-100" />
        </div>
      </div>

      <div className="rounded-2xl border border-stone-200/60 bg-white p-4 shadow-sm">
        <div className="h-4 w-28 animate-pulse rounded bg-stone-200" />
        <div className="mt-3 h-24 w-full animate-pulse rounded-xl bg-stone-100" />
      </div>
    </div>
  );
}

export default function ExpensesLoading() {
  return (
    <div className="space-y-4" aria-hidden="true">
      {/* Month nav skeleton */}
      <div className="flex items-center justify-between px-1">
        <div className="h-9 w-9 animate-pulse rounded-full bg-stone-100" />
        <div className="h-5 w-20 animate-pulse rounded bg-stone-200" />
        <div className="h-9 w-9 animate-pulse rounded-full bg-stone-100" />
      </div>

      {/* Summary card skeleton */}
      <div className="rounded-2xl border border-stone-200/60 bg-white p-4 shadow-sm">
        <div className="flex items-center gap-2 mb-3">
          <div className="h-4 w-4 animate-pulse rounded bg-stone-200" />
          <div className="h-4 w-16 animate-pulse rounded bg-stone-200" />
        </div>
        <div className="h-9 w-32 animate-pulse rounded bg-stone-200 mb-1" />
        <div className="h-3 w-24 animate-pulse rounded bg-stone-100 mb-3" />
        <div className="grid grid-cols-2 gap-2 mb-3">
          <div className="rounded-xl bg-stone-50 px-3 py-2.5">
            <div className="h-3 w-12 animate-pulse rounded bg-stone-200 mb-1.5" />
            <div className="h-5 w-16 animate-pulse rounded bg-stone-200" />
          </div>
          <div className="rounded-xl bg-red-50/60 px-3 py-2.5">
            <div className="h-3 w-12 animate-pulse rounded bg-red-100 mb-1.5" />
            <div className="h-5 w-16 animate-pulse rounded bg-red-100" />
          </div>
        </div>
        <div className="h-2 w-full animate-pulse rounded-full bg-stone-100" />
      </div>

      {/* Category chart skeleton */}
      <div className="rounded-2xl border border-stone-200/60 bg-white p-4 shadow-sm">
        <div className="h-4 w-20 animate-pulse rounded bg-stone-200 mb-3" />
        <div className="h-36 w-full animate-pulse rounded-xl bg-stone-100" />
      </div>

      {/* Expense history skeleton */}
      <div className="rounded-2xl border border-stone-200/60 bg-white p-4 shadow-sm">
        <div className="h-4 w-16 animate-pulse rounded bg-stone-200 mb-3" />
        <div className="space-y-2">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="flex items-center gap-3 rounded-xl px-3 py-2.5 bg-stone-50">
              <div className="flex-1 space-y-1.5">
                <div className="h-3.5 w-2/3 animate-pulse rounded bg-stone-200" />
                <div className="h-3 w-1/2 animate-pulse rounded bg-stone-100" />
              </div>
              <div className="h-4 w-12 animate-pulse rounded bg-stone-200" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function ShoppingLoading() {
  return (
    <div className="space-y-4" aria-hidden="true">
      {/* Header + add button skeleton */}
      <div className="flex items-center justify-between">
        <div className="h-5 w-24 animate-pulse rounded bg-stone-200" />
        <div className="h-9 w-9 animate-pulse rounded-full bg-stone-100" />
      </div>

      {/* Active items skeleton */}
      <div className="rounded-2xl border border-stone-200/60 bg-white p-4 shadow-sm">
        <div className="h-4 w-20 animate-pulse rounded bg-stone-200 mb-3" />
        <div className="space-y-2">
          {[...Array(4)].map((_, i) => (
            <div
              key={i}
              className="flex items-center gap-3 rounded-xl bg-stone-50 px-3 py-3"
            >
              <div className="h-5 w-5 animate-pulse rounded bg-stone-200" />
              <div className="flex-1 space-y-1.5">
                <div className="h-3.5 w-3/5 animate-pulse rounded bg-stone-200" />
                <div className="h-3 w-2/5 animate-pulse rounded bg-stone-100" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Purchased items skeleton */}
      <div className="rounded-2xl border border-stone-200/60 bg-white p-4 shadow-sm">
        <div className="h-4 w-16 animate-pulse rounded bg-stone-200 mb-3" />
        <div className="space-y-2">
          {[...Array(2)].map((_, i) => (
            <div
              key={i}
              className="flex items-center gap-3 rounded-xl bg-stone-50 px-3 py-2.5"
            >
              <div className="h-5 w-5 animate-pulse rounded bg-stone-200" />
              <div className="flex-1">
                <div className="h-3.5 w-1/2 animate-pulse rounded bg-stone-200" />
              </div>
              <div className="h-3 w-12 animate-pulse rounded bg-stone-100" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

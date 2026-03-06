export default function RulesLoading() {
  return (
    <div className="space-y-4" aria-hidden="true">
      {/* Header + add button skeleton */}
      <div className="flex items-center justify-between">
        <div className="h-5 w-24 animate-pulse rounded bg-stone-200" />
        <div className="h-9 w-9 animate-pulse rounded-full bg-stone-100" />
      </div>

      {/* Pending rules skeleton */}
      <div className="rounded-2xl border border-amber-200/60 bg-amber-50/30 p-4 shadow-sm">
        <div className="h-4 w-24 animate-pulse rounded bg-amber-200 mb-3" />
        <div className="rounded-xl bg-white px-3 py-3">
          <div className="h-3.5 w-1/2 animate-pulse rounded bg-stone-200 mb-1.5" />
          <div className="h-3 w-1/3 animate-pulse rounded bg-stone-100" />
        </div>
      </div>

      {/* Category groups skeleton */}
      {[...Array(3)].map((_, i) => (
        <div
          key={i}
          className="rounded-2xl border border-stone-200/60 bg-white p-4 shadow-sm"
        >
          <div className="h-4 w-20 animate-pulse rounded bg-stone-200 mb-3" />
          <div className="space-y-2">
            {[...Array(2)].map((_, j) => (
              <div key={j} className="rounded-xl bg-stone-50 px-3 py-3">
                <div className="h-3.5 w-2/3 animate-pulse rounded bg-stone-200 mb-1.5" />
                <div className="h-3 w-full animate-pulse rounded bg-stone-100" />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

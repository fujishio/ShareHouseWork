export default function TasksLoading() {
  return (
    <div className="space-y-4" aria-hidden="true">
      {/* Urgent tasks section skeleton */}
      <section className="rounded-2xl border border-stone-200/60 bg-white p-4 shadow-sm">
        <div className="h-5 w-28 animate-pulse rounded bg-stone-200 mb-3" />
        <div className="space-y-2">
          {[...Array(3)].map((_, i) => (
            <div
              key={i}
              className="flex items-center gap-3 rounded-xl bg-stone-50 px-3 py-3"
            >
              <div className="h-8 w-8 animate-pulse rounded-full bg-stone-200" />
              <div className="flex-1 space-y-1.5">
                <div className="h-3.5 w-2/3 animate-pulse rounded bg-stone-200" />
                <div className="h-3 w-1/3 animate-pulse rounded bg-stone-100" />
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Monthly contribution carousel skeleton */}
      <div className="rounded-2xl border border-stone-200/60 bg-white p-4 shadow-sm">
        <div className="h-4 w-24 animate-pulse rounded bg-stone-200 mb-3" />
        <div className="h-40 w-full animate-pulse rounded-xl bg-stone-100" />
      </div>

      {/* Recent completions skeleton */}
      <div className="rounded-2xl border border-stone-200/60 bg-white p-4 shadow-sm">
        <div className="h-4 w-20 animate-pulse rounded bg-stone-200 mb-3" />
        <div className="space-y-2">
          {[...Array(4)].map((_, i) => (
            <div
              key={i}
              className="flex items-center gap-3 rounded-xl bg-stone-50 px-3 py-2.5"
            >
              <div className="h-6 w-6 animate-pulse rounded-full bg-stone-200" />
              <div className="flex-1 space-y-1">
                <div className="h-3.5 w-1/2 animate-pulse rounded bg-stone-200" />
                <div className="h-3 w-1/4 animate-pulse rounded bg-stone-100" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

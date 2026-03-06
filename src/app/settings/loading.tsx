export default function SettingsLoading() {
  return (
    <div className="space-y-4" aria-hidden="true">
      {/* Notification settings skeleton */}
      <div className="rounded-2xl border border-stone-200/60 bg-white p-4 shadow-sm">
        <div className="flex items-center gap-2 mb-2">
          <div className="h-4 w-4 animate-pulse rounded bg-stone-200" />
          <div className="h-4 w-24 animate-pulse rounded bg-stone-200" />
        </div>
        <div className="h-3 w-48 animate-pulse rounded bg-stone-100 mb-1" />
        <div className="h-3 w-28 animate-pulse rounded bg-stone-100" />
      </div>

      {/* Toggle items skeleton */}
      <div className="space-y-2">
        {[...Array(2)].map((_, i) => (
          <div
            key={i}
            className="flex items-start justify-between gap-3 rounded-xl border border-stone-200/60 bg-white p-3"
          >
            <div className="flex-1 space-y-1">
              <div className="h-3.5 w-32 animate-pulse rounded bg-stone-200" />
              <div className="h-3 w-48 animate-pulse rounded bg-stone-100" />
            </div>
            <div className="h-7 w-12 animate-pulse rounded-full bg-stone-200" />
          </div>
        ))}
      </div>

      {/* Reset button skeleton */}
      <div className="h-10 w-full animate-pulse rounded-xl bg-stone-100" />

      {/* Additional sections skeleton */}
      {[...Array(3)].map((_, i) => (
        <div
          key={i}
          className="rounded-2xl border border-stone-200/60 bg-white p-4 shadow-sm"
        >
          <div className="h-4 w-28 animate-pulse rounded bg-stone-200 mb-2" />
          <div className="h-3 w-40 animate-pulse rounded bg-stone-100" />
        </div>
      ))}
    </div>
  );
}

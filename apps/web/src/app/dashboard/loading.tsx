export default function DashboardLoading() {
  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      {/* Page Title Skeleton */}
      <div className="space-y-2">
        <div className="h-7 w-48 rounded-md bg-muted/60 animate-pulse" />
        <div className="h-4 w-72 rounded-md bg-muted/40 animate-pulse" />
      </div>

      {/* KPI Stat Cards Skeleton */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="rounded-lg border bg-card p-5 space-y-3 shadow-xs"
          >
            <div className="flex items-center justify-between">
              <div className="h-4 w-20 rounded bg-muted/60 animate-pulse" />
              <div className="h-8 w-8 rounded-md bg-muted/40 animate-pulse" />
            </div>
            <div className="space-y-1.5 pt-1">
              <div className="h-7 w-28 rounded bg-muted/70 animate-pulse" />
              <div className="h-3 w-36 rounded bg-muted/40 animate-pulse" />
            </div>
          </div>
        ))}
      </div>

      {/* Main Chart / Content Skeleton */}
      <div className="rounded-lg border bg-card p-6 space-y-4 shadow-xs">
        <div className="flex items-center justify-between border-b pb-4">
          <div className="h-5 w-40 rounded bg-muted/60 animate-pulse" />
          <div className="h-4 w-24 rounded bg-muted/40 animate-pulse" />
        </div>
        <div className="h-64 w-full rounded-md bg-muted/30 animate-pulse flex items-center justify-center">
          <div className="h-6 w-6 rounded-full border-2 border-primary/40 border-t-primary animate-spin" />
        </div>
      </div>

      {/* Table Skeleton */}
      <div className="rounded-lg border bg-card p-4 space-y-3 shadow-xs">
        <div className="h-4 w-32 rounded bg-muted/60 animate-pulse" />
        <div className="space-y-2 pt-2">
          {[1, 2, 3, 4].map((r) => (
            <div key={r} className="h-10 w-full rounded bg-muted/20 animate-pulse" />
          ))}
        </div>
      </div>
    </div>
  );
}

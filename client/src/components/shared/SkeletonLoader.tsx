export function SkeletonLine({ width = "w-full" }: { width?: string }) {
  return <div className={`animate-pulse rounded-lg bg-slate-700 h-4 ${width}`} />;
}

export function SkeletonBlock({ lines = 3 }: { lines?: number }) {
  const widths = ["w-full", "w-3/4", "w-5/6", "w-1/2", "w-2/3"];
  return (
    <div className="space-y-3 py-4">
      {Array.from({ length: lines }).map((_, i) => (
        <SkeletonLine key={i} width={widths[i % widths.length]} />
      ))}
    </div>
  );
}

export function SkeletonPills({ count = 4 }: { count?: number }) {
  return (
    <div className="flex flex-wrap gap-2 py-2">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="animate-pulse rounded-full bg-slate-700 h-6 w-20" />
      ))}
    </div>
  );
}

export function SkeletonTable({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-2 py-4">
      <div className="flex gap-4">
        <SkeletonLine width="w-1/3" />
        <SkeletonLine width="w-1/4" />
        <SkeletonLine width="w-1/6" />
      </div>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex gap-4">
          <div className="animate-pulse rounded bg-slate-700 h-4 w-1/3" />
          <div className="animate-pulse rounded bg-slate-700 h-4 w-1/4" />
          <div className="animate-pulse rounded bg-slate-700 h-4 w-1/6" />
        </div>
      ))}
    </div>
  );
}

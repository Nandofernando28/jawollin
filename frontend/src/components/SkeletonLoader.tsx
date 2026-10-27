import React from 'react';

export function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse rounded-lg bg-slate-800/50 ${className}`} />;
}

export function KpiSkeleton() {
  return (
    <div className="grid grid-cols-2 xl:grid-cols-3 gap-3">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 space-y-3">
          <Skeleton className="h-3.5 w-28" />
          <Skeleton className="h-9 w-36" />
          <Skeleton className="h-3 w-full" />
        </div>
      ))}
    </div>
  );
}

export function ChartSkeleton({ height = 260 }: { height?: number }) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5 space-y-3">
      <Skeleton className="h-5 w-64" />
      <Skeleton className="h-3 w-40" />
      <div className="animate-pulse rounded-lg bg-slate-800/50 w-full" style={{ height: `${height}px` }} />
    </div>
  );
}

export function MapSkeleton() {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5 space-y-3">
      <Skeleton className="h-5 w-56" />
      <Skeleton className="h-[280px] w-full rounded-lg" />
      <Skeleton className="h-6 w-full" />
    </div>
  );
}

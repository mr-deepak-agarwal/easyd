import { cn } from "@/lib/utils";

export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden className={cn("skeleton rounded-lg bg-raised", className)} />;
}

/** Page-shaped placeholder shown while a route loads: title, a row of tiles, then a list. */
export function PageSkeleton({ tiles = 3, rows = 6 }: { tiles?: number; rows?: number }) {
  return (
    <div role="status" aria-label="Loading" className="space-y-6">
      <div className="space-y-2"><Skeleton className="h-7 w-56" /><Skeleton className="h-4 w-80 max-w-full" /></div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{Array.from({ length: tiles }, (_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)}</div>
      <div className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">
        {Array.from({ length: rows }, (_, i) => <div key={i} className="flex items-center gap-4 px-4 py-3.5"><Skeleton className="size-3 rounded-full" /><Skeleton className="h-4 flex-1" /><Skeleton className="h-4 w-24" /></div>)}
      </div>
      <span className="sr-only">Loading</span>
    </div>
  );
}

export function BoardSkeleton() {
  return (
    <div role="status" aria-label="Loading tasks" className="space-y-5">
      <div className="space-y-2"><Skeleton className="h-7 w-32" /><Skeleton className="h-4 w-72 max-w-full" /></div>
      <div className="flex gap-4 overflow-hidden">
        {Array.from({ length: 4 }, (_, c) => (
          <div key={c} className="w-72 shrink-0 space-y-2 rounded-xl bg-raised p-2">
            <Skeleton className="h-5 w-28 bg-card" />
            {Array.from({ length: 3 - (c % 2) }, (_, i) => <Skeleton key={i} className="h-20 rounded-lg bg-card" />)}
          </div>))}
      </div>
      <span className="sr-only">Loading</span>
    </div>
  );
}

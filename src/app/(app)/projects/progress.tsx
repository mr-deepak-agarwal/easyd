export function Progress({ value }: { value: number }) {
  const v = Math.max(0, Math.min(100, value));
  return (
    <div className="flex min-w-28 items-center gap-2" role="img" aria-label={`${v}% complete`}>
      <div className="h-2 flex-1 overflow-hidden rounded-full bg-border"><div className="h-full bg-brand" style={{ width: `${v}%` }} /></div>
      <span className="w-10 text-right text-xs text-muted">{Math.round(v)}%</span>
    </div>
  );
}

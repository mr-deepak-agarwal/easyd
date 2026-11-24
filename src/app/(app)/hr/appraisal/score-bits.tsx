import type { Band } from "@/lib/score";

const TONE: Record<Band, string> = {
  Excellent: "bg-brand-soft text-brand", Good: "bg-info-soft text-info",
  "Needs improvement": "bg-warn-soft text-warn", Poor: "bg-danger-soft text-danger",
};
export function BandBadge({ band }: { band: Band | null }) {
  return band ? <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${TONE[band]}`}>{band}</span> : <span className="text-xs text-muted">Not enough data</span>;
}
export function Bar({ value }: { value: number | null }) {
  if (value === null) return <span className="text-xs text-muted">n/a</span>;
  const color = value >= 85 ? "bg-green-600" : value >= 70 ? "bg-blue-600" : value >= 50 ? "bg-amber-500" : "bg-red-600";
  return (
    <div className="flex items-center gap-2">
      <div className="h-2 w-28 overflow-hidden rounded-full bg-border" role="img" aria-label={`${Math.round(value)} out of 100`}><div className={`h-full ${color}`} style={{ width: `${value}%` }} /></div>
      <span className="w-9 text-right text-sm tabular-nums">{Math.round(value)}</span>
    </div>
  );
}

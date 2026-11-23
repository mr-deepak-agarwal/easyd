import type { Band } from "@/lib/score";

const TONE: Record<Band, string> = {
  Excellent: "bg-green-100 text-green-800", Good: "bg-blue-100 text-blue-800",
  "Needs improvement": "bg-amber-100 text-amber-800", Poor: "bg-red-100 text-red-800",
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

import { cn } from "@/lib/utils";

const tones = {
  green: "bg-emerald-50 text-emerald-800",
  amber: "bg-amber-50 text-amber-800",
  red: "bg-red-50 text-danger",
  grey: "bg-slate-100 text-slate-700",
};
const dots = { green: "bg-emerald-500", amber: "bg-amber-500", red: "bg-red-500", grey: "bg-slate-400" };

export function Badge({ tone = "grey", children }: { tone?: keyof typeof tones; children: React.ReactNode }) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium", tones[tone])}>
      <span className={cn("size-1.5 rounded-full", dots[tone])} aria-hidden />
      {children}
    </span>
  );
}

export function LeaveStatusBadge({ status }: { status: string }) {
  if (status === "approved") return <Badge tone="green">Approved</Badge>;
  if (status === "rejected") return <Badge tone="red">Rejected</Badge>;
  return <Badge tone="amber">Pending</Badge>;
}

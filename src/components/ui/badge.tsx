import { cn } from "@/lib/utils";

const tones = {
  green: "bg-brand-soft text-brand",
  amber: "bg-warn-soft text-warn",
  red: "bg-danger-soft text-danger",
  blue: "bg-info-soft text-info",
  violet: "bg-violet-soft text-violet",
  grey: "bg-raised text-muted",
};

export function Badge({ tone = "grey", children }: { tone?: keyof typeof tones; children: React.ReactNode }) {
  return <span className={cn("inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium", tones[tone])}>{children}</span>;
}

export function LeaveStatusBadge({ status }: { status: string }) {
  if (status === "approved") return <Badge tone="green">Approved</Badge>;
  if (status === "rejected") return <Badge tone="red">Rejected</Badge>;
  return <Badge tone="amber">Pending</Badge>;
}

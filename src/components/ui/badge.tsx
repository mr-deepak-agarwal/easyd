import { cn } from "@/lib/utils";

const tones = {
  green: "bg-brand-soft text-brand",
  amber: "bg-amber-100 text-amber-800",
  red: "bg-red-100 text-danger",
  grey: "bg-gray-100 text-gray-700",
};

export function Badge({ tone = "grey", children }: { tone?: keyof typeof tones; children: React.ReactNode }) {
  return <span className={cn("inline-block rounded-full px-2.5 py-0.5 text-xs font-medium", tones[tone])}>{children}</span>;
}

export function LeaveStatusBadge({ status }: { status: string }) {
  if (status === "approved") return <Badge tone="green">Approved</Badge>;
  if (status === "rejected") return <Badge tone="red">Rejected</Badge>;
  return <Badge tone="amber">Pending</Badge>;
}

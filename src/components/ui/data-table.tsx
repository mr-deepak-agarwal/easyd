import { cn } from "@/lib/utils";

export function Table({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("overflow-x-auto rounded-xl border border-border bg-card", className)}>
      <table className="w-full text-left text-sm">{children}</table>
    </div>
  );
}
export function Th({ children, className }: { children?: React.ReactNode; className?: string }) {
  return <th className={cn("border-b border-border bg-background px-3 py-2 text-xs font-semibold uppercase tracking-wide text-muted", className)}>{children}</th>;
}
export function Td({ children, className, colSpan }: { children?: React.ReactNode; className?: string; colSpan?: number }) {
  return <td colSpan={colSpan} className={cn("border-b border-border px-3 py-2 align-top", className)}>{children}</td>;
}
export function EmptyRow({ cols, text = "No records found" }: { cols: number; text?: string }) {
  return <tr><Td colSpan={cols} className="py-8 text-center text-muted">{text}</Td></tr>;
}

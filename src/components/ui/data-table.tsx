import { cn } from "@/lib/utils";

export function Table({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("overflow-x-auto rounded-xl border border-border bg-card shadow-[var(--shadow)]", className)}>
      <table className="w-full text-left text-sm [&_tbody_tr:hover]:bg-raised [&_tbody_tr:last-child_td]:border-b-0">{children}</table>
    </div>
  );
}
export function Th({ children, className }: { children?: React.ReactNode; className?: string }) {
  return <th className={cn("border-b border-border bg-raised px-3 py-2.5 text-xs font-medium text-muted", className)}>{children}</th>;
}
export function Td({ children, className, colSpan }: { children?: React.ReactNode; className?: string; colSpan?: number }) {
  return <td colSpan={colSpan} className={cn("border-b border-border px-3 py-2.5 align-top", className)}>{children}</td>;
}
export function EmptyRow({ cols, text = "Nothing here yet" }: { cols: number; text?: string }) {
  return <tr><Td colSpan={cols} className="py-10 text-center text-muted">{text}</Td></tr>;
}

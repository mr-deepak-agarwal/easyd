import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { Inbox } from "lucide-react";

/** An empty list says what belongs here and offers the next step. */
export function EmptyState({ title, hint, action, Icon = Inbox, compact = false }: {
  title: string; hint?: string; action?: { label: string; href: string }; Icon?: LucideIcon; compact?: boolean;
}) {
  return (
    <div className={`flex flex-col items-center text-center ${compact ? "gap-1.5 py-6" : "gap-2 py-12"}`}>
      <span className="grid size-11 place-items-center rounded-2xl bg-brand-soft text-brand"><Icon className="size-5" aria-hidden /></span>
      <p className="text-sm font-medium">{title}</p>
      {hint && <p className="max-w-sm text-sm text-muted">{hint}</p>}
      {action && <Link href={action.href} className="mt-1 rounded-lg bg-brand px-3.5 py-1.5 text-sm font-medium text-white hover:opacity-90">{action.label}</Link>}
    </div>
  );
}

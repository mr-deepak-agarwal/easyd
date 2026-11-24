"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

export function Tabs({ items }: { items: { label: string; href: string }[] }) {
  const pathname = usePathname();
  return (
    <div className="mb-5 flex gap-1 overflow-x-auto rounded-lg bg-raised p-1" role="tablist">
      {items.map((t) => {
        const on = pathname === t.href;
        return (
          <Link key={t.href} href={t.href} role="tab" aria-selected={on}
            className={cn("whitespace-nowrap rounded-md px-3.5 py-1.5 text-sm transition-colors", on ? "bg-card font-medium text-brand shadow-[var(--shadow)]" : "text-muted hover:text-foreground")}>
            {t.label}
          </Link>
        );
      })}
    </div>
  );
}

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

export function Tabs({ items }: { items: { label: string; href: string }[] }) {
  const pathname = usePathname();
  return (
    <div className="mb-5 flex gap-1 border-b border-border">
      {items.map((t) => (
        <Link key={t.href} href={t.href}
          className={cn("-mb-px border-b-2 px-4 py-2 text-sm", pathname === t.href ? "border-brand font-medium text-brand" : "border-transparent text-muted hover:text-foreground")}>
          {t.label}
        </Link>
      ))}
    </div>
  );
}

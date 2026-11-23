"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import type { NavGroup } from "@/lib/nav";

export function Sidebar({ groups }: { groups: NavGroup[] }) {
  const pathname = usePathname();
  return (
    <aside className="hidden w-64 shrink-0 flex-col overflow-y-auto bg-brand text-white md:flex">
      <div className="px-5 py-5 text-xl font-semibold">Easy D</div>
      <nav className="flex-1 px-3 pb-6">
        {groups.map((g) => (
          <div key={g.label} className="mb-4">
            <div className="px-2 pb-1 text-xs font-medium uppercase tracking-wide text-white/60">{g.label}</div>
            {g.items.map((i) => {
              const active = pathname === i.href || (i.href !== "/dashboard" && pathname.startsWith(i.href + "/"));
              return (
                <Link key={i.href} href={i.href}
                  className={cn("block rounded-md px-2 py-1.5 text-sm hover:bg-white/10", active && "bg-white/15 font-medium")}>
                  {i.label}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>
    </aside>
  );
}

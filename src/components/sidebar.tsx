"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { ChevronDown, Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { NavGroup } from "@/lib/nav";
import { NavIcon } from "@/components/nav-icons";

function isActive(pathname: string, href: string) {
  return pathname === href || (href !== "/dashboard" && pathname.startsWith(href + "/"));
}

function Brand() {
  return (
    <Link href="/dashboard" className="flex items-center gap-2.5 px-4 py-4">
      <span className="grid size-8 place-items-center rounded-lg bg-accent text-base font-semibold text-sidebar">E</span>
      <span className="text-[15px] font-semibold tracking-tight text-white">Easy D</span>
    </Link>
  );
}

function NavList({ groups, onNavigate }: { groups: NavGroup[]; onNavigate?: () => void }) {
  const pathname = usePathname();
  const [opened, setOpened] = useState<Record<string, boolean>>({});

  return (
    <nav className="flex-1 overflow-y-auto px-2.5 pb-6" aria-label="Main">
      {groups.map((g) => {
        const hasActive = g.items.some((i) => isActive(pathname, i.href));
        const open = hasActive || (opened[g.label] ?? g.label === "Home");
        return (
          <div key={g.label} className="mb-1">
            <button
              type="button"
              onClick={() => setOpened((o) => ({ ...o, [g.label]: !open }))}
              aria-expanded={open}
              className="flex w-full items-center gap-1 rounded-md px-2 py-1.5 text-xs font-semibold text-white/45 transition-colors hover:text-white/80"
            >
              <ChevronDown className={cn("size-3.5 transition-transform", !open && "-rotate-90")} aria-hidden />
              {g.label}
            </button>
            {open && (
              <ul className="mt-0.5 space-y-0.5">
                {g.items.map((i) => {
                  const active = isActive(pathname, i.href);
                  return (
                    <li key={i.href}>
                      <Link
                        href={i.href}
                        onClick={onNavigate}
                        aria-current={active ? "page" : undefined}
                        className={cn(
                          "group relative flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-[13px] text-sidebar-text transition-colors",
                          "hover:bg-white/[0.07] hover:text-white",
                          active && "bg-white/[0.12] font-medium text-white",
                        )}
                      >
                        {active && <span className="absolute -left-2.5 top-1.5 bottom-1.5 w-[3px] rounded-r bg-accent" aria-hidden />}
                        <NavIcon href={i.href} className={cn("size-4 shrink-0", active ? "text-accent" : "text-white/50 group-hover:text-white/80")} />
                        <span className="truncate">{i.label}</span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        );
      })}
    </nav>
  );
}

export function Sidebar({ groups }: { groups: NavGroup[] }) {
  return (
    <aside className="hidden w-60 shrink-0 flex-col bg-sidebar md:flex">
      <Brand />
      <NavList groups={groups} />
    </aside>
  );
}

/** Hamburger + slide-in drawer for screens below the md breakpoint. */
export function MobileNav({ groups }: { groups: NavGroup[] }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Open menu"
        className="grid size-9 place-items-center rounded-md text-muted hover:bg-background md:hidden"
      >
        <Menu className="size-5" aria-hidden />
      </button>
      {open && (
        <div className="fixed inset-0 z-50 md:hidden" role="dialog" aria-modal="true" aria-label="Menu">
          <button type="button" aria-label="Close menu" className="absolute inset-0 bg-black/50" onClick={() => setOpen(false)} />
          <aside className="relative flex h-full w-72 max-w-[85%] flex-col bg-sidebar shadow-2xl">
            <div className="flex items-center justify-between pr-3">
              <Brand />
              <button type="button" onClick={() => setOpen(false)} aria-label="Close menu" className="grid size-8 place-items-center rounded-md text-white/60 hover:text-white">
                <X className="size-5" aria-hidden />
              </button>
            </div>
            <NavList groups={groups} onNavigate={() => setOpen(false)} />
          </aside>
        </div>
      )}
    </>
  );
}

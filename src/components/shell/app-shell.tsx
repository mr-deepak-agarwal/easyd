"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Keyboard, LogOut, Menu, Search, UserRound, X } from "lucide-react";
import type { NavGroup } from "@/lib/nav";
import { cn } from "@/lib/utils";
import { iconFor } from "./icons";
import { CommandPalette } from "./command-palette";
import { ThemeToggle } from "./theme-toggle";
import { NotificationBell } from "./notification-bell";
import { ShortcutHelp, useShortcuts } from "./shortcuts";

type Props = { unread: number; groups: NavGroup[]; user: { name: string; empid: string; roleLabel: string }; logout: () => Promise<void>; children: React.ReactNode };

const initials = (n: string) => n.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]!.toUpperCase()).join("") || "?";
const matches = (path: string, href: string) => path === href || (href !== "/dashboard" && path.startsWith(href + "/"));

export function AppShell({ unread, groups, user, logout, children }: Props) {
  const path = usePathname();
  // The most specific link wins, so /projects/profitability does not also light up /projects.
  const best = useMemo(() => groups.flatMap((g) => g.items).filter((i) => matches(path, i.href)).sort((a, b) => b.href.length - a.href.length)[0]?.href, [groups, path]);
  const isActive = (_p: string, href: string) => href === best;
  const owner = useMemo(() => groups.find((g) => g.items.some((i) => i.href === best))?.label ?? groups[0]?.label, [groups, best]);
  const [picked, setPicked] = useState<string | null>(null);
  const [drawer, setDrawer] = useState(false), [palette, setPalette] = useState(false), [help, setHelp] = useState(false);
  const allowed = useMemo(() => new Set(groups.flatMap((g) => g.items.map((i) => i.href))), [groups]);
  const openPalette = useCallback(() => setPalette(true), []), openHelp = useCallback(() => setHelp(true), []);
  useShortcuts({ allowed, openPalette, openHelp });
  const shown = groups.find((g) => g.label === (picked ?? owner)) ?? groups[0];

  const [seenPath, setSeenPath] = useState(path);
  if (seenPath !== path) { setSeenPath(path); setPicked(null); setDrawer(false); }
  useEffect(() => {
    const k = (e: KeyboardEvent) => { if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") { e.preventDefault(); setPalette((p) => !p); } };
    window.addEventListener("keydown", k); return () => window.removeEventListener("keydown", k);
  }, []);

  const rail = (
    <nav aria-label="Modules" className="flex h-full w-[68px] shrink-0 flex-col items-center gap-2 bg-rail py-3 text-[--rail-fg]">
      <Link href="/dashboard" aria-label="Easy D home" className="mb-1 grid size-11 place-items-center rounded-2xl bg-white/10 text-[15px] font-semibold text-white transition hover:rounded-xl">ED</Link>
      <div className="h-px w-8 bg-white/15" />
      {groups.map((g) => {
        const Icon = iconFor(g.label), on = g.label === shown?.label, here = g.label === owner;
        return (
          <div key={g.label} className="relative">
            <span aria-hidden className={cn("absolute -left-3 top-1/2 w-1 -translate-y-1/2 rounded-r-full bg-white transition-all", on ? "h-8" : here ? "h-2" : "h-0")} />
            <button type="button" onClick={() => setPicked(g.label)} aria-label={g.label} aria-pressed={on} title={g.label}
              className={cn("grid size-11 place-items-center text-white/80 transition-all duration-200 hover:rounded-xl hover:bg-[--rail-hover] hover:text-white", on ? "rounded-xl bg-white/20 text-white" : "rounded-[22px] bg-white/[0.07]")}>
              <Icon className="size-5" aria-hidden />
            </button>
          </div>);
      })}
    </nav>
  );
  const panel = (
    <div className="flex h-full w-60 shrink-0 flex-col border-r border-border bg-card">
      <div className="flex h-14 items-center border-b border-border px-4 text-[15px] font-semibold">{shown?.label}</div>
      <ul className="flex-1 space-y-0.5 overflow-y-auto p-2">
        {shown?.items.map((i) => {
          const on = isActive(path, i.href);
          return (
            <li key={i.href}>
              <Link href={i.href} aria-current={on ? "page" : undefined}
                className={cn("flex items-center rounded-lg px-3 py-2 text-sm transition-colors", on ? "bg-brand-soft font-medium text-brand" : "text-muted hover:bg-raised hover:text-foreground")}>
                {i.label}
              </Link>
            </li>);
        })}
      </ul>
    </div>
  );

  return (
    <div className="flex h-screen print:block print:h-auto">
      <a href="#main" className="skip-link">Skip to content</a>
      <div className="hidden md:flex print:hidden">{rail}{panel}</div>
      {drawer && (
        <div className="fixed inset-0 z-40 flex md:hidden print:hidden" onMouseDown={(e) => { if (e.target === e.currentTarget) setDrawer(false); }}>
          <div className="flex shadow-2xl">{rail}{panel}</div>
          <div className="flex-1 bg-black/50" />
        </div>)}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 shrink-0 items-center gap-2 border-b border-border bg-card px-3 sm:px-5 print:hidden">
          <button type="button" aria-label="Open menu" onClick={() => setDrawer(true)} className="grid size-9 place-items-center rounded-lg text-muted hover:bg-raised md:hidden"><Menu className="size-5" /></button>
          <button type="button" onClick={() => setPalette(true)} className="group flex h-9 min-w-0 flex-1 items-center gap-2 rounded-lg border border-border bg-raised px-3 text-left text-sm text-muted transition hover:border-brand sm:max-w-md">
            <Search className="size-4 shrink-0" aria-hidden /><span className="truncate">Search or ask anything</span>
            <kbd className="ml-auto hidden rounded border border-border bg-card px-1.5 py-0.5 text-[11px] sm:block">Ctrl K</kbd>
          </button>
          <div className="ml-auto flex items-center gap-1">
            <NotificationBell initial={unread} />
            <ThemeToggle />
            <details className="group relative">
              <summary aria-label="Account menu" className="grid size-9 cursor-pointer list-none place-items-center rounded-full bg-brand text-xs font-semibold text-white ring-offset-2 ring-offset-card transition hover:ring-2 hover:ring-brand [&::-webkit-details-marker]:hidden">{initials(user.name)}</summary>
              <div className="absolute right-0 z-30 mt-2 w-64 rounded-xl border border-border bg-card p-2 shadow-2xl">
                <div className="px-3 py-2"><p className="truncate text-sm font-medium">{user.name}</p><p className="text-xs text-muted">{user.empid} · {user.roleLabel}</p></div>
                <div className="my-1 h-px bg-border" />
                <button type="button" onClick={() => setHelp(true)} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm hover:bg-raised"><Keyboard className="size-4 text-muted" aria-hidden />Keyboard shortcuts</button>
                <Link href="/profile" className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-raised"><UserRound className="size-4 text-muted" aria-hidden />My account</Link>
                <form action={logout}><button type="submit" className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm hover:bg-raised"><LogOut className="size-4 text-muted" aria-hidden />Log out</button></form>
              </div>
            </details>
          </div>
        </header>
        <main id="main" tabIndex={-1} className="flex-1 overflow-y-auto outline-none p-4 sm:p-6 print:overflow-visible print:p-0"><div className="mx-auto w-full max-w-[1400px]">{children}</div></main>
      </div>
      {help && <ShortcutHelp allowed={allowed} onClose={() => setHelp(false)} />}
      {palette && <CommandPalette groups={groups} onClose={() => setPalette(false)} />}
      {drawer && <button type="button" aria-label="Close menu" onClick={() => setDrawer(false)} className="fixed left-[322px] top-3 z-50 grid size-9 place-items-center rounded-full bg-card text-foreground shadow md:hidden"><X className="size-5" /></button>}
    </div>
  );
}

"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { LogOut, UserCircle } from "lucide-react";

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return ((parts[0]?.[0] ?? "") + (parts.length > 1 ? parts[parts.length - 1][0] : "")).toUpperCase() || "?";
}

export function UserMenu({
  name, empid, roleLabel, logout,
}: { name: string; empid: string; roleLabel: string; logout: () => void | Promise<void> }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="flex items-center gap-2 rounded-full py-1 pl-1 pr-3 transition-colors hover:bg-background"
      >
        <span className="grid size-8 place-items-center rounded-full bg-brand text-xs font-semibold text-white">{initials(name)}</span>
        <span className="hidden text-left leading-tight sm:block">
          <span className="block text-[13px] font-medium">{name}</span>
          <span className="block text-[11px] text-muted">{roleLabel}</span>
        </span>
      </button>
      {open && (
        <div role="menu" className="absolute right-0 z-40 mt-2 w-60 overflow-hidden rounded-xl border border-border bg-card shadow-lg">
          <div className="border-b border-border px-4 py-3">
            <div className="text-sm font-medium">{name}</div>
            <div className="text-xs text-muted">{empid} · {roleLabel}</div>
          </div>
          <div className="p-1.5">
            <Link href="/profile" role="menuitem" onClick={() => setOpen(false)}
              className="flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm hover:bg-background">
              <UserCircle className="size-4 text-muted" aria-hidden /> My account
            </Link>
            <form action={logout}>
              <button type="submit" role="menuitem" className="flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-sm text-danger hover:bg-red-50">
                <LogOut className="size-4" aria-hidden /> Log out
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

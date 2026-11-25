"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Bell, CheckCheck } from "lucide-react";
import { KIND_ICON } from "./kind-icons";
import { getNotifications, getUnreadCount, markAllRead, markRead, type Note } from "@/app/(app)/notifications/actions";
import { timeAgo } from "@/lib/notify-core";
import { cn } from "@/lib/utils";


export function NotificationBell({ initial }: { initial: number }) {
  const router = useRouter();
  const [unread, setUnread] = useState(initial), [open, setOpen] = useState(false);
  const [items, setItems] = useState<Note[] | null>(null);
  const [, start] = useTransition();
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const tick = () => { if (document.visibilityState === "visible") getUnreadCount().then(setUnread).catch(() => {}); };
    const t = setInterval(tick, 60_000); document.addEventListener("visibilitychange", tick);
    return () => { clearInterval(t); document.removeEventListener("visibilitychange", tick); };
  }, []);
  useEffect(() => {
    if (!open) return;
    const away = (e: MouseEvent) => { if (!box.current?.contains(e.target as Node)) setOpen(false); };
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", away); document.addEventListener("keydown", esc);
    return () => { document.removeEventListener("mousedown", away); document.removeEventListener("keydown", esc); };
  }, [open]);

  function toggle() {
    const next = !open; setOpen(next);
    if (next) start(async () => { const r = await getNotifications(); setItems(r.items); setUnread(r.unread); });
  }
  function go(n: Note) {
    setOpen(false);
    start(async () => { if (!n.read_at) { await markRead(n.id); setUnread((u) => Math.max(0, u - 1)); } if (n.href) router.push(n.href); });
  }

  return (
    <div ref={box} className="relative">
      <button type="button" onClick={toggle} aria-label={unread ? `Notifications, ${unread} unread` : "Notifications"} aria-expanded={open}
        className="relative grid size-9 place-items-center rounded-lg text-muted transition hover:bg-raised hover:text-foreground">
        <Bell className="size-[18px]" aria-hidden />
        {unread > 0 && <span className="absolute right-1 top-1 grid min-w-4 place-items-center rounded-full bg-danger px-1 text-[10px] font-semibold leading-4 text-white" style={{ backgroundColor: "#d92d20" }}>{unread > 9 ? "9+" : unread}</span>}
      </button>
      {open && (
        <div role="dialog" aria-label="Notifications" className="fixed inset-x-3 top-14 z-40 overflow-hidden rounded-2xl border border-border bg-card shadow-2xl sm:absolute sm:inset-x-auto sm:right-0 sm:top-full sm:mt-2 sm:w-96">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <h2 className="text-sm font-semibold">Notifications</h2>
            <button type="button" disabled={!unread} onClick={() => start(async () => { await markAllRead(); setUnread(0); setItems((l) => l && l.map((n) => ({ ...n, read_at: n.read_at ?? new Date().toISOString() }))); })}
              className="flex items-center gap-1 text-xs text-brand hover:underline disabled:opacity-40"><CheckCheck className="size-3.5" aria-hidden />Mark all read</button>
          </div>
          <ul className="max-h-[60vh] overflow-y-auto">
            {items === null && <li className="px-4 py-8 text-center text-sm text-muted">Loading...</li>}
            {items?.length === 0 && <li className="px-4 py-10 text-center text-sm text-muted">You are all caught up.</li>}
            {items?.map((n) => { const Icon = KIND_ICON[n.kind] ?? Bell; return (
              <li key={n.id}>
                <button type="button" onClick={() => go(n)} className={cn("flex w-full gap-3 border-b border-border px-4 py-3 text-left last:border-0 hover:bg-raised", !n.read_at && "bg-brand-soft/40")}>
                  <span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-full bg-brand-soft text-brand"><Icon className="size-4" aria-hidden /></span>
                  <span className="min-w-0 flex-1"><span className={cn("block text-sm", !n.read_at && "font-medium")}>{n.title}</span>
                    {n.body && <span className="block truncate text-xs text-muted">{n.body}</span>}
                    <span className="mt-0.5 block text-xs text-muted">{timeAgo(n.created_at)}</span></span>
                  {!n.read_at && <span aria-label="Unread" className="mt-2 size-2 shrink-0 rounded-full bg-accent" />}
                </button>
              </li>); })}
          </ul>
          <Link href="/notifications" onClick={() => setOpen(false)} className="block border-t border-border px-4 py-2.5 text-center text-sm text-brand hover:bg-raised">See all</Link>
        </div>)}
    </div>
  );
}

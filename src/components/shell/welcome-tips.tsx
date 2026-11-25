"use client";

import { useSyncExternalStore } from "react";
import { Bell, Command, Keyboard, X } from "lucide-react";

const KEY = "easyd-tips-v1";
const listeners = new Set<() => void>();
const read = () => { try { return localStorage.getItem(KEY) === "1"; } catch { return true; } };   // storage blocked: do not nag
const subscribe = (cb: () => void) => { listeners.add(cb); return () => { listeners.delete(cb); }; };

/** Three one-line tips on the first visit. Dismissed for good, per browser. */
export function WelcomeTips() {
  const dismissed = useSyncExternalStore(subscribe, read, () => true);
  if (dismissed) return null;
  const close = () => { try { localStorage.setItem(KEY, "1"); } catch {} listeners.forEach((l) => l()); };
  const tips = [
    { Icon: Command, title: "Search everything", text: "Press Ctrl K (or /) to find tasks, projects, clients and invoices, or to ask EasyD a question." },
    { Icon: Keyboard, title: "Move without the mouse", text: "Press ? to see shortcuts. C starts a new task, G then T opens Tasks." },
    { Icon: Bell, title: "Never miss a mention", text: "The bell tells you when you are given a task, mentioned, or something is due." },
  ];
  return (
    <section aria-label="Getting started" className="relative rounded-xl border border-border bg-brand-soft p-4 pr-12">
      <button type="button" onClick={close} aria-label="Dismiss tips" className="absolute right-2 top-2 grid size-8 place-items-center rounded-lg text-muted hover:bg-card"><X className="size-4" aria-hidden /></button>
      <div className="grid gap-4 md:grid-cols-3">
        {tips.map(({ Icon, title, text }) => (
          <div key={title} className="flex gap-3">
            <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-card text-brand"><Icon className="size-4" aria-hidden /></span>
            <div><p className="text-sm font-medium">{title}</p><p className="text-sm text-muted">{text}</p></div>
          </div>))}
      </div>
    </section>
  );
}

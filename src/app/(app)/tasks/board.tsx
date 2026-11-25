"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Check } from "lucide-react";
import { formatDate } from "@/lib/dates";
import { setTaskStatus } from "./actions";
import { useToast } from "@/components/ui/toast";

export type BoardTask = { id: number; title: string; ends_on: string | null; project: string | null; people: string[] };

function addDays(d: string, n: number) { const x = new Date(d + "T00:00:00Z"); x.setUTCDate(x.getUTCDate() + n); return x.toISOString().slice(0, 10); }
const initials = (n: string) => n.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]!.toUpperCase()).join("");

/** Open tasks laid out by when they are due, like a ClickUp board. Ticking a card completes it. */
export function Board({ tasks, today }: { tasks: BoardTask[]; today: string }) {
  const { toast } = useToast();
  const [, start] = useTransition();
  const [gone, setGone] = useState<Set<number>>(new Set());   // cards completed this session: they leave the board at once
  const [leaving, setLeaving] = useState<Set<number>>(new Set());
  const flip = (set: Set<number>, id: number, on: boolean) => { const n = new Set(set); if (on) n.add(id); else n.delete(id); return n; };
  const complete = (t: BoardTask) => {
    setLeaving((s) => flip(s, t.id, true));
    setTimeout(() => setGone((s) => flip(s, t.id, true)), 220);
    start(async () => { await setTaskStatus(t.id, true); });
    toast(`"${t.title.slice(0, 40)}" marked done`, {
      undo: async () => { setGone((s) => flip(s, t.id, false)); setLeaving((s) => flip(s, t.id, false)); await setTaskStatus(t.id, false); },
    });
  };
  const week = addDays(today, 7);
  const cols = [
    { key: "late", title: "Overdue", dot: "bg-danger", test: (t: BoardTask) => !!t.ends_on && t.ends_on < today },
    { key: "today", title: "Today", dot: "bg-accent", test: (t: BoardTask) => t.ends_on === today },
    { key: "week", title: "Next 7 days", dot: "bg-info", test: (t: BoardTask) => !!t.ends_on && t.ends_on > today && t.ends_on <= week },
    { key: "later", title: "Later", dot: "bg-violet", test: (t: BoardTask) => !!t.ends_on && t.ends_on > week },
    { key: "none", title: "No date", dot: "bg-muted", test: (t: BoardTask) => !t.ends_on },
  ].map((c) => ({ ...c, items: tasks.filter((t) => !gone.has(t.id)).filter(c.test) }));

  return (
    <div className="-mx-4 flex gap-4 overflow-x-auto px-4 pb-4 sm:-mx-6 sm:px-6" role="list" aria-label="Tasks by due date">
      {cols.map((c) => (
        <section key={c.key} role="listitem" aria-label={c.title} className="flex w-72 shrink-0 flex-col rounded-xl bg-raised p-2">
          <h2 className="flex items-center gap-2 px-2 py-2 text-sm font-semibold"><span aria-hidden className={`size-2.5 rounded-full ${c.dot}`} />{c.title}<span className="ml-auto rounded-md bg-card px-1.5 text-xs font-medium text-muted">{c.items.length}</span></h2>
          <ul className="space-y-2">
            {c.items.map((t) => (
              <li key={t.id} className={`group flex gap-2.5 rounded-lg border border-border bg-card p-3 shadow-[var(--shadow)] transition hover:border-brand ${leaving.has(t.id) ? "card-out" : ""}`}>
                <div>
                  <button type="button" onClick={() => complete(t)} aria-label={`Mark "${t.title}" done`} title="Mark done" className="mt-0.5 grid size-5 place-items-center rounded-full border-2 border-border text-transparent transition hover:border-accent hover:text-accent"><Check className="size-3" strokeWidth={3} /></button>
                </div>
                <div className="min-w-0 flex-1">
                  <Link href={`/tasks/${t.id}`} className="block text-sm font-medium leading-snug hover:text-brand">{t.title}</Link>
                  {t.project && <p className="mt-1 truncate text-xs text-muted">{t.project}</p>}
                  <div className="mt-2 flex items-center justify-between gap-2">
                    <span className={`text-xs ${c.key === "late" ? "font-medium text-danger" : "text-muted"}`}>{t.ends_on ? formatDate(t.ends_on) : ""}</span>
                    <span className="flex -space-x-1.5">{t.people.slice(0, 3).map((n) => <span key={n} title={n} className="grid size-6 place-items-center rounded-full border-2 border-card bg-brand-soft text-[10px] font-semibold text-brand">{initials(n)}</span>)}</span>
                  </div>
                </div>
              </li>))}
            {!c.items.length && <li className="px-2 py-6 text-center text-xs text-muted">{c.key === "late" ? "Nothing overdue. Nice." : "Nothing here"}</li>}
          </ul>
        </section>))}
    </div>
  );
}

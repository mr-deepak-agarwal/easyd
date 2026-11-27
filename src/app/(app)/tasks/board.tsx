"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Check, Lock, Repeat } from "lucide-react";
import { formatDate } from "@/lib/dates";
import { addDays, STAGES, stageLabel, type StageKey } from "@/lib/task-core";
import { moveTask } from "./actions";
import { useToast } from "@/components/ui/toast";

export type BoardTask = {
  id: number; title: string; ends_on: string | null; project: string | null; people: string[];
  stage: StageKey; blockedBy: string[]; repeats: boolean;
};

const initials = (n: string) => n.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]!.toUpperCase()).join("");
const STAGE_DOT: Record<StageKey, string> = { todo: "bg-muted", in_progress: "bg-info", review: "bg-violet", done: "bg-accent" };

/**
 * Open tasks as a board, like ClickUp. Grouped by workflow stage (drag a card, or use its "Move to" list) or by due date.
 * A move shows at once and can be undone. The database has the final word, for example on a task that is waiting for another.
 */
export function Board({ tasks, today, group }: { tasks: BoardTask[]; today: string; group: "status" | "due" }) {
  const { toast } = useToast();
  const [, start] = useTransition();
  const [placed, setPlaced] = useState<Record<number, StageKey>>({});   // moves shown before the server confirms
  const [over, setOver] = useState<StageKey | null>(null);
  const [dragging, setDragging] = useState<number | null>(null);
  const stageOf = (t: BoardTask) => placed[t.id] ?? t.stage;

  const move = (t: BoardTask, to: StageKey) => {
    const from = stageOf(t);
    if (from === to) return;
    if (to === "done" && t.blockedBy.length) { toast(`Finish "${t.blockedBy[0]}" first`, { tone: "error" }); return; }
    setPlaced((p) => ({ ...p, [t.id]: to }));
    start(async () => {
      const r = await moveTask(t.id, to);
      if (!r.ok) { setPlaced((p) => { const n = { ...p }; delete n[t.id]; return n; }); toast(r.error, { tone: "error" }); return; }
      toast(`"${t.title.slice(0, 36)}" ${to === "done" ? "marked done" : `moved to ${stageLabel(to)}`}`, {
        undo: async () => { setPlaced((p) => ({ ...p, [t.id]: from })); const u = await moveTask(t.id, from); if (!u.ok) toast(u.error, { tone: "error" }); },
      });
    });
  };

  // A plain function, not a component: a component defined here would be rebuilt on every render and cancel a drag in progress.
  const card = (t: BoardTask, late?: boolean) => {
    const s = stageOf(t);
    return (
      <li key={t.id} draggable={group === "status"} onDragStart={(e) => { e.dataTransfer.setData("text/plain", String(t.id)); e.dataTransfer.effectAllowed = "move"; setDragging(t.id); }} onDragEnd={() => { setDragging(null); setOver(null); }}
        className={`group flex gap-2.5 rounded-lg border border-border bg-card p-3 shadow-[var(--shadow)] transition hover:border-brand ${group === "status" ? "cursor-grab active:cursor-grabbing" : ""} ${dragging === t.id ? "opacity-40" : ""}`}>
        <div>
          <button type="button" onClick={() => move(t, s === "done" ? "todo" : "done")} aria-label={s === "done" ? `Reopen "${t.title}"` : `Mark "${t.title}" done`} title={s === "done" ? "Reopen" : "Mark done"}
            className={`mt-0.5 grid size-5 place-items-center rounded-full border-2 transition ${s === "done" ? "border-accent bg-accent text-white" : "border-border text-transparent hover:border-accent hover:text-accent"}`}><Check className="size-3" strokeWidth={3} /></button>
        </div>
        <div className="min-w-0 flex-1">
          <Link href={`/tasks/${t.id}`} className={`block text-sm font-medium leading-snug hover:text-brand ${s === "done" ? "text-muted line-through" : ""}`}>{t.title}</Link>
          {t.project && <p className="mt-1 truncate text-xs text-muted">{t.project}</p>}
          {(t.blockedBy.length > 0 || t.repeats || (group === "due" && s !== "todo" && s !== "done")) && (
            <div className="mt-1.5 flex flex-wrap gap-1.5 text-xs">
              {t.blockedBy.length > 0 && <span title={`Waiting for: ${t.blockedBy.join(", ")}`} className="inline-flex items-center gap-1 rounded-md bg-warn-soft px-1.5 py-0.5 text-warn"><Lock className="size-3" aria-hidden />Waiting for {t.blockedBy.length}</span>}
              {t.repeats && <span title="Repeats" className="inline-flex items-center gap-1 rounded-md bg-raised px-1.5 py-0.5 text-muted"><Repeat className="size-3" aria-hidden />Repeats</span>}
              {group === "due" && s !== "todo" && s !== "done" && <span className="rounded-md bg-info-soft px-1.5 py-0.5 text-info">{stageLabel(s)}</span>}
            </div>)}
          <div className="mt-2 flex items-center justify-between gap-2">
            <span className={`whitespace-nowrap text-xs ${late ? "font-medium text-danger" : "text-muted"}`}>{t.ends_on ? formatDate(t.ends_on) : ""}</span>
            <span className="flex items-center gap-2">
              {group === "status" && (
                <select aria-label={`Move "${t.title}" to`} value={s} onChange={(e) => move(t, e.target.value as StageKey)}
                  className="rounded-md border border-border bg-card px-1 py-0.5 text-xs opacity-0 transition focus:opacity-100 group-focus-within:opacity-100 group-hover:opacity-100">
                  {STAGES.map((c) => <option key={c.key} value={c.key}>{c.label}</option>)}
                </select>)}
              <span className="flex -space-x-1.5">{t.people.slice(0, 3).map((n) => <span key={n} title={n} className="grid size-6 place-items-center rounded-full border-2 border-card bg-brand-soft text-[10px] font-semibold text-brand">{initials(n)}</span>)}</span>
            </span>
          </div>
        </div>
      </li>
    );
  };

  if (group === "status") {
    return (
      <div className="-mx-4 flex gap-4 overflow-x-auto px-4 pb-4 sm:-mx-6 sm:px-6" role="list" aria-label="Tasks by stage">
        {STAGES.map((c) => {
          const items = tasks.filter((t) => stageOf(t) === c.key);
          return (
            <section key={c.key} role="listitem" aria-label={c.label}
              onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = "move"; setOver(c.key); }} onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setOver(null); }}
              onDrop={(e) => { e.preventDefault(); const t = tasks.find((x) => x.id === Number(e.dataTransfer.getData("text/plain"))); setOver(null); setDragging(null); if (t) move(t, c.key); }}
              className={`flex w-72 shrink-0 flex-col rounded-xl p-2 transition ${over === c.key ? "bg-brand-soft outline outline-2 -outline-offset-2 outline-brand" : "bg-raised"}`}>
              <h2 className="flex items-center gap-2 px-2 py-2 text-sm font-semibold"><span aria-hidden className={`size-2.5 rounded-full ${STAGE_DOT[c.key]}`} />{c.label}<span className="ml-auto rounded-md bg-card px-1.5 text-xs font-medium text-muted">{items.length}</span></h2>
              <ul className="min-h-16 space-y-2">
                {items.map((t) => card(t, c.key !== "done" && !!t.ends_on && t.ends_on < today))}
                {!items.length && <li className="px-2 py-6 text-center text-xs text-muted">{c.key === "done" ? "Finished work from the last 14 days shows here" : "Drop a task here"}</li>}
              </ul>
            </section>);
        })}
      </div>
    );
  }

  const week = addDays(today, 7);
  const open = tasks.filter((t) => stageOf(t) !== "done");
  const cols = [
    { key: "late", title: "Overdue", dot: "bg-danger", test: (t: BoardTask) => !!t.ends_on && t.ends_on < today },
    { key: "today", title: "Today", dot: "bg-accent", test: (t: BoardTask) => t.ends_on === today },
    { key: "week", title: "Next 7 days", dot: "bg-info", test: (t: BoardTask) => !!t.ends_on && t.ends_on > today && t.ends_on <= week },
    { key: "later", title: "Later", dot: "bg-violet", test: (t: BoardTask) => !!t.ends_on && t.ends_on > week },
    { key: "none", title: "No date", dot: "bg-muted", test: (t: BoardTask) => !t.ends_on },
  ].map((c) => ({ ...c, items: open.filter(c.test) }));
  return (
    <div className="-mx-4 flex gap-4 overflow-x-auto px-4 pb-4 sm:-mx-6 sm:px-6" role="list" aria-label="Tasks by due date">
      {cols.map((c) => (
        <section key={c.key} role="listitem" aria-label={c.title} className="flex w-72 shrink-0 flex-col rounded-xl bg-raised p-2">
          <h2 className="flex items-center gap-2 px-2 py-2 text-sm font-semibold"><span aria-hidden className={`size-2.5 rounded-full ${c.dot}`} />{c.title}<span className="ml-auto rounded-md bg-card px-1.5 text-xs font-medium text-muted">{c.items.length}</span></h2>
          <ul className="space-y-2">
            {c.items.map((t) => card(t, c.key === "late"))}
            {!c.items.length && <li className="px-2 py-6 text-center text-xs text-muted">{c.key === "late" ? "Nothing overdue. Nice." : "Nothing here"}</li>}
          </ul>
        </section>))}
    </div>
  );
}

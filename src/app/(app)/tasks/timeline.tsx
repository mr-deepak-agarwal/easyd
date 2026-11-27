import Link from "next/link";
import { addDays, dayDiff, filterQuery, weekStart, type TaskFilters } from "@/lib/task-core";
import { formatDate } from "@/lib/dates";

export type TimelineTask = { id: number; title: string; project: string | null; starts_on: string | null; ends_on: string | null; stage: string; done: boolean; blocked: boolean };

const DAY = 28, ROW = 40, SPAN = 56;   // pixels per day, pixels per row, days shown (eight weeks)

/** A week-by-week Gantt of the tasks that have dates. Arrows run from a task to the ones waiting for it. Server-rendered, no script. */
export function Timeline({ tasks, deps, f, today, hidden }: { tasks: TimelineTask[]; deps: { task_id: number; depends_on_id: number }[]; f: TaskFilters; today: string; hidden: number }) {
  const start = f.from ? weekStart(f.from) : weekStart(addDays(today, -7));
  const end = addDays(start, SPAN - 1);
  const rows = tasks
    .map((t) => { const e = t.ends_on ?? t.starts_on!; const s = t.starts_on && t.starts_on <= e ? t.starts_on : e; return { t, s, e }; })
    .filter(({ s, e }) => e >= start && s <= end)
    .sort((a, b) => (a.t.project ?? "~").localeCompare(b.t.project ?? "~") || a.s.localeCompare(b.s) || a.t.id - b.t.id);
  const index = new Map(rows.map((r, i) => [r.t.id, i]));
  const x = (d: string) => Math.max(0, Math.min(SPAN, dayDiff(start, d))) * DAY;
  const width = SPAN * DAY, height = Math.max(rows.length, 1) * ROW;
  const nav = (from: string) => { const q = filterQuery({ ...f, from }); return `/tasks?${q}`; };
  const todayX = dayDiff(start, today) >= 0 && today <= end ? dayDiff(start, today) * DAY + DAY / 2 : null;
  const weeks = Array.from({ length: SPAN / 7 }, (_, i) => addDays(start, i * 7));
  const colour = (t: TimelineTask, late: boolean) =>
    t.done ? "bg-accent/60 border-accent" : late ? "bg-danger-soft border-danger" : t.stage === "in_progress" ? "bg-info-soft border-info" : t.stage === "review" ? "bg-violet-soft border-violet" : "bg-brand-soft border-brand";

  const links = deps.filter((d) => index.has(d.task_id) && index.has(d.depends_on_id)).map((d) => {
    const from = rows[index.get(d.depends_on_id)!], to = rows[index.get(d.task_id)!];
    const x1 = x(from.e) + DAY - 2, y1 = index.get(d.depends_on_id)! * ROW + ROW / 2, x2 = x(to.s) + 2, y2 = index.get(d.task_id)! * ROW + ROW / 2;
    const mid = Math.max(x1 + 8, Math.min(x2 - 8, (x1 + x2) / 2));
    return { key: `${d.depends_on_id}-${d.task_id}`, d: x2 >= x1 + 12 ? `M${x1} ${y1} H${mid} V${y2} H${x2 - 3}` : `M${x1} ${y1} H${x1 + 8} V${(y1 + y2) / 2} H${x2 - 10} V${y2} H${x2 - 3}`, x2, y2 };
  });

  return (
    <section aria-label="Timeline" className="space-y-3">
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <Link href={nav(addDays(start, -28))} className="rounded-lg border border-border bg-card px-3 py-1.5 hover:bg-raised">Earlier</Link>
        <Link href={nav("")} className="rounded-lg border border-border bg-card px-3 py-1.5 hover:bg-raised">Today</Link>
        <Link href={nav(addDays(start, 28))} className="rounded-lg border border-border bg-card px-3 py-1.5 hover:bg-raised">Later</Link>
        <span className="text-muted">{formatDate(start)} to {formatDate(end)}</span>
        {hidden > 0 && <span className="ml-auto text-muted">{hidden} task{hidden === 1 ? " has" : "s have"} no dates and {hidden === 1 ? "is" : "are"} not shown</span>}
      </div>
      <div className="overflow-x-auto rounded-xl border border-border bg-card shadow-[var(--shadow)]">
        <div className="flex" style={{ minWidth: 224 + width }}>
          <div className="sticky left-0 z-10 w-56 shrink-0 border-r border-border bg-card">
            <div className="h-9 border-b border-border px-3 text-xs font-medium leading-9 text-muted">Task</div>
            {rows.map(({ t }) => (
              <div key={t.id} className="flex h-10 flex-col justify-center border-b border-border/60 px-3">
                <Link href={`/tasks/${t.id}`} className={`truncate text-sm font-medium hover:text-brand ${t.done ? "text-muted line-through" : ""}`}>{t.title}</Link>
                {t.project && <span className="truncate text-xs text-muted">{t.project}</span>}
              </div>))}
          </div>
          <div style={{ width }}>
            <div className="relative h-9 border-b border-border" aria-hidden>
              {weeks.map((w, i) => <span key={w} className="absolute top-0 h-9 border-l border-border pl-1.5 text-xs leading-9 text-muted" style={{ left: i * 7 * DAY }}>{formatDate(w).slice(0, 6)}</span>)}
            </div>
            <div className="relative" style={{ height }}>
              {Array.from({ length: SPAN }, (_, i) => { const dow = new Date(addDays(start, i) + "T00:00:00Z").getUTCDay(); return dow === 0 || dow === 6 ? <div key={i} aria-hidden className="absolute inset-y-0 bg-raised/70" style={{ left: i * DAY, width: DAY }} /> : null; })}
              {todayX !== null && <div aria-hidden title="Today" className="absolute inset-y-0 z-[1] w-0.5 bg-danger" style={{ left: todayX }} />}
              {rows.map(({ t, s, e }, i) => {
                const late = !t.done && !!t.ends_on && t.ends_on < today;
                return (
                  <Link key={t.id} href={`/tasks/${t.id}`} title={`${t.title}: ${formatDate(s)}${s !== e ? ` to ${formatDate(e)}` : ""}${t.blocked ? " (waiting on another task)" : ""}`}
                    className={`absolute z-[2] rounded-md border ${colour(t, late)} ${t.blocked ? "border-dashed" : ""} hover:brightness-95`}
                    style={{ left: x(s) + 1, width: Math.max(DAY - 2, x(addDays(e, 1)) - x(s) - 2), top: i * ROW + 8, height: ROW - 16 }}><span className="sr-only">{t.title}</span></Link>);
              })}
              <svg aria-hidden className="pointer-events-none absolute inset-0 z-[3] text-muted" width={width} height={height}>
                {links.map((l) => (<g key={l.key}><path d={l.d} fill="none" stroke="currentColor" strokeWidth="1.5" /><path d={`M${l.x2 - 6} ${l.y2 - 4} L${l.x2} ${l.y2} L${l.x2 - 6} ${l.y2 + 4} Z`} fill="currentColor" /></g>))}
              </svg>
            </div>
          </div>
        </div>
        {!rows.length && <p className="px-4 py-10 text-center text-sm text-muted">No dated tasks in these eight weeks. Give tasks a start and due date and they appear here.</p>}
      </div>
      <p className="text-xs text-muted">Solid arrows lead to the task that is waiting. A dashed outline means the task is waiting on another. Red bars are overdue.</p>
    </section>
  );
}

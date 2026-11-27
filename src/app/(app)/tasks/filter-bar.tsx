"use client";

import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { filterQuery, type TaskFilters } from "@/lib/task-core";

/** Filters apply as you change them; the address always holds the current filters, so a view can be saved or shared. */
export function FilterBar({ f, projects }: { f: TaskFilters; projects: { id: number; name: string }[] }) {
  const router = useRouter();
  const go = (patch: Partial<TaskFilters>) => { const q = filterQuery({ ...f, ...patch }); router.push(q ? `/tasks?${q}` : "/tasks"); };
  const sel = "rounded-lg border border-border bg-card px-2.5 py-1.5 text-sm";
  const active = f.who !== "all" || f.due !== "any" || f.project || f.q;
  return (
    <form role="search" aria-label="Filter tasks" onSubmit={(e) => { e.preventDefault(); go({ q: String(new FormData(e.currentTarget).get("q") ?? "").trim() }); }} className="flex flex-wrap items-center gap-2">
      <label className="relative">
        <span className="sr-only">Search tasks</span>
        <Search className="pointer-events-none absolute left-2.5 top-2 size-4 text-muted" aria-hidden />
        <input key={f.q} name="q" defaultValue={f.q} placeholder="Search tasks" maxLength={60} className="w-44 rounded-lg border border-border bg-card py-1.5 pl-8 pr-2.5 text-sm" />
      </label>
      <select aria-label="Whose tasks" className={sel} value={f.who} onChange={(e) => go({ who: e.target.value as TaskFilters["who"] })}>
        <option value="all">Everyone&apos;s</option><option value="me">Mine</option>
      </select>
      <select aria-label="Due" className={sel} value={f.due} onChange={(e) => go({ due: e.target.value as TaskFilters["due"] })}>
        <option value="any">Any due date</option><option value="overdue">Overdue</option><option value="today">Due today</option><option value="week">Due in 7 days</option><option value="none">No due date</option>
      </select>
      <select aria-label="Project" className={`${sel} max-w-48`} value={f.project ?? ""} onChange={(e) => go({ project: e.target.value ? Number(e.target.value) : null })}>
        <option value="">All projects</option>{projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
      </select>
      {active && <button type="button" onClick={() => go({ who: "all", due: "any", project: null, q: "" })} className="rounded-lg px-2.5 py-1.5 text-sm text-brand hover:bg-brand-soft">Clear filters</button>}
    </form>
  );
}

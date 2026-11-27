import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/session";
import { formatDate, todayIST } from "@/lib/dates";
import { PageHeader } from "@/components/ui/page-header";
import { Table, Th, Td, EmptyRow } from "@/components/ui/data-table";
import { ActionForm } from "@/components/ui/action-form";
import { SubmitButton } from "@/components/ui/submit-button";
import { Badge } from "@/components/ui/badge";
import { GanttChart, LayoutGrid, List, Lock, Repeat } from "lucide-react";
import { addDays, filterQuery, parseFilters, stageLabel, type StageKey } from "@/lib/task-core";
import { createTask } from "./actions";
import { Board, type BoardTask } from "./board";
import { TaskFields } from "./task-fields";
import { FilterBar } from "./filter-bar";
import { SavedViews } from "./saved-views";
import { Timeline, type TimelineTask } from "./timeline";

const SELECT = "id, title, starts_on, ends_on, status, stage, repeat_rule, project_id, completed_at, projects(name), creator:created_by(name), task_participants(is_responsible, profiles(name))";
const VIEWS = [["board", "Board", LayoutGrid], ["list", "List", List], ["timeline", "Timeline", GanttChart]] as const;

export default async function TasksPage({ searchParams }: PageProps<"/tasks">) {
  const user = await requireUser();
  const sp = await searchParams;
  const f = parseFilters(sp);
  const supabase = await createClient();
  const today = todayIST();

  // "Mine" means tasks I am on. Looked up first so the main query stays simple.
  let mineIds: number[] | null = null;
  if (f.who === "me") mineIds = ((await supabase.from("task_participants").select("task_id").eq("profile_id", user.id)).data ?? []).map((r) => r.task_id);

  const build = (status: "created" | "completed") => {
    let q = supabase.from("tasks").select(SELECT).eq("status", status);
    if (f.q) q = q.ilike("title", `%${f.q.replace(/[\\%_]/g, (c) => "\\" + c)}%`);
    if (f.project) q = q.eq("project_id", f.project);
    if (mineIds) q = q.in("id", mineIds.length ? mineIds : [0]);
    if (f.due === "overdue") q = q.lt("ends_on", today);
    else if (f.due === "today") q = q.eq("ends_on", today);
    else if (f.due === "week") q = q.gte("ends_on", today).lte("ends_on", addDays(today, 7));
    else if (f.due === "none") q = q.is("ends_on", null);
    return q;
  };
  const showDone = f.show === "open" && f.view === "board" && f.group === "status";
  const [openRes, doneRes, { data: people }, { data: projects }, { data: views }] = await Promise.all([
    f.show === "completed" ? build("completed").order("completed_at", { ascending: false, nullsFirst: false }).limit(300) : build("created").order("ends_on", { ascending: true, nullsFirst: false }).limit(300),
    showDone ? build("completed").gte("completed_at", `${addDays(today, -14)}T00:00:00+05:30`).order("completed_at", { ascending: false }).limit(40) : Promise.resolve({ data: [] as never[] }),
    supabase.from("profiles").select("id, name").eq("active", true).order("name"),
    supabase.from("projects").select("id, name").in("status", ["approved", "pending"]).order("name").limit(300),
    supabase.from("saved_views").select("id, name, query").eq("scope", "tasks").order("name"),
  ]);
  const tasks = [...(openRes.data ?? []), ...(doneRes.data ?? [])];

  // What each task is waiting for, and who waits on it (for arrows).
  const ids = tasks.map((t) => t.id);
  const { data: depRows } = ids.length ? await supabase.from("task_dependencies").select("task_id, depends_on_id, blocker:depends_on_id(title, status)").in("task_id", ids) : { data: [] };
  const blockedBy = new Map<number, string[]>();
  for (const d of depRows ?? []) {
    const b = d.blocker as { title: string; status: string } | null;
    if (b && b.status !== "completed") blockedBy.set(d.task_id, [...(blockedBy.get(d.task_id) ?? []), b.title]);
  }
  const stageOf = (t: { status: string; stage: string }): StageKey => (t.status === "completed" ? "done" : (t.stage as StageKey));
  const resp = (t: (typeof tasks)[number]) => t.task_participants.filter((p) => p.is_responsible).map((p) => (p.profiles as { name: string } | null)?.name ?? "").filter(Boolean);

  const currentQuery = filterQuery(f);
  const href = (patch: Partial<typeof f>) => { const q = filterQuery({ ...f, ...patch }); return q ? `/tasks?${q}` : "/tasks"; };
  const dated = tasks.filter((t) => t.starts_on || t.ends_on);

  return (
    <div className="space-y-4">
      <PageHeader title="Tasks" description="Tasks you created or are part of, and tasks on your projects">
        <Link href="/tasks/from-notes" className="rounded-lg border border-border bg-card px-3 py-2 text-sm hover:bg-raised">Tasks from notes (AI)</Link>
        <div className="flex rounded-lg bg-raised p-1" role="group" aria-label="View">
          {VIEWS.map(([k, label, Icon]) => (
            <Link key={k} href={href({ view: k })} aria-current={f.view === k ? "true" : undefined}
              className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm ${f.view === k ? "bg-card font-medium text-brand shadow-[var(--shadow)]" : "text-muted hover:text-foreground"}`}><Icon className="size-4" aria-hidden />{label}</Link>
          ))}
        </div>
        <div className="flex rounded-lg bg-raised p-1" role="group" aria-label="Status">
          {([["open", "Open"], ["completed", "Completed"]] as const).map(([k, label]) => (
            <Link key={k} href={href({ show: k })} aria-current={k === f.show ? "true" : undefined}
              className={`rounded-md px-3 py-1.5 text-sm ${k === f.show ? "bg-card font-medium text-brand shadow-[var(--shadow)]" : "text-muted hover:text-foreground"}`}>{label}</Link>
          ))}
        </div>
      </PageHeader>

      <div className="space-y-3">
        <FilterBar f={f} projects={(projects ?? []).map((p) => ({ id: p.id, name: p.name ?? `Project ${p.id}` }))} />
        <SavedViews views={views ?? []} currentQuery={currentQuery} />
        {f.view === "board" && f.show === "open" && (
          <div className="flex items-center gap-2 text-sm text-muted" role="group" aria-label="Group board by">
            Group by
            {([["status", "Stage"], ["due", "Due date"]] as const).map(([k, l]) => (
              <Link key={k} href={href({ group: k })} aria-current={f.group === k ? "true" : undefined} className={`rounded-md px-2.5 py-1 ${f.group === k ? "bg-brand-soft font-medium text-brand" : "hover:bg-raised"}`}>{l}</Link>))}
          </div>)}
      </div>

      <details open={sp.new === "1"} className="rounded-xl border border-border bg-card p-5 shadow-[var(--shadow)]">
        <summary className="cursor-pointer text-sm font-semibold">New task</summary>
        <ActionForm action={createTask.bind(null, null)} className="mt-4 grid gap-4 sm:grid-cols-2" resetOnSuccess={false}>
          <TaskFields people={people ?? []} />
          <div className="sm:col-span-2"><SubmitButton>Create task</SubmitButton></div>
        </ActionForm>
      </details>

      {f.view === "board" && f.show === "open" ? (
        <Board today={today} group={f.group} tasks={tasks.map((t): BoardTask => ({ id: t.id, title: t.title, ends_on: t.ends_on, project: t.projects?.name ?? null, people: resp(t), stage: stageOf(t), blockedBy: blockedBy.get(t.id) ?? [], repeats: !!t.repeat_rule }))} />
      ) : f.view === "timeline" ? (
        <Timeline today={today} f={f} hidden={tasks.length - dated.length} deps={(depRows ?? []).map((d) => ({ task_id: d.task_id, depends_on_id: d.depends_on_id }))}
          tasks={dated.map((t): TimelineTask => ({ id: t.id, title: t.title, project: t.projects?.name ?? null, starts_on: t.starts_on, ends_on: t.ends_on, stage: t.stage, done: t.status === "completed", blocked: (blockedBy.get(t.id) ?? []).length > 0 }))} />
      ) : (
        <Table>
          <thead><tr><Th>Task</Th><Th>Stage</Th><Th>Project</Th><Th>Responsible</Th><Th>Due</Th><Th>Created by</Th></tr></thead>
          <tbody>
            {tasks.length ? tasks.map((t) => {
              const late = f.show === "open" && t.ends_on && t.ends_on < today;
              const waits = blockedBy.get(t.id) ?? [];
              return (
                <tr key={t.id}>
                  <Td>
                    <Link href={`/tasks/${t.id}`} className="font-medium text-brand hover:underline">{t.title}</Link>
                    {waits.length > 0 && <span title={`Waiting for: ${waits.join(", ")}`} className="ml-2 inline-flex items-center gap-1 rounded-md bg-warn-soft px-1.5 py-0.5 align-middle text-xs text-warn"><Lock className="size-3" aria-hidden />Waiting</span>}
                    {t.repeat_rule && <Repeat className="ml-2 inline size-3.5 align-middle text-muted" aria-label="Repeats" />}
                  </Td>
                  <Td><Badge tone={t.status === "completed" ? "green" : t.stage === "in_progress" ? "blue" : t.stage === "review" ? "violet" : "grey"}>{t.status === "completed" ? "Done" : stageLabel(t.stage)}</Badge></Td>
                  <Td>{t.projects?.name ?? "-"}</Td><Td>{resp(t).join(", ") || "-"}</Td>
                  <Td>{formatDate(t.ends_on)} {late && <Badge tone="red">Overdue</Badge>}</Td>
                  <Td>{(t.creator as { name: string } | null)?.name ?? "-"}</Td>
                </tr>
              );
            }) : <EmptyRow cols={6} text={currentQuery.replace(/view=\w+&?|show=\w+&?|group=\w+&?/g, "") ? "No tasks match these filters" : f.show === "completed" ? "No completed tasks" : "No open tasks"} hint="Change or clear the filters, or add a task above." />}
          </tbody>
        </Table>
      )}
    </div>
  );
}
